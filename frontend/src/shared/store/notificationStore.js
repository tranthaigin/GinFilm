import { create } from 'zustand';
import axios from '../api/client';


const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isFetching: false,

  fetchNotifications: async () => {
    set({ isFetching: true });
    try {
      const res = await axios.get('/notifications', {
        withCredentials: true
      });
      const data = res.data;

      const unreadCount = data.filter(n => !n.isRead).length;

      set({ notifications: data, unreadCount, isFetching: false });
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ isFetching: false });
      return [];
    }
  },

  addNotification: (notification) => {
    set((state) => {
      // Avoid duplicate by id
      if (state.notifications.some(n => n.id === notification.id)) {
        return state;
      }
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    });
  },

  markAsRead: async (id) => {
    const notification = get().notifications.find(n => n.id === id);
    if (!notification || notification.isRead) return;

    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));

    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('notifications_sync_channel');
      channel.postMessage({ type: 'MARK_AS_READ', id });
      channel.close();
    }

    try {
      await axios.put(`/notifications/${id}/read`, {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      // Revert if failed
      set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: false } : n
        ),
        unreadCount: state.unreadCount + 1
      }));
    }
  },

  markAllAsRead: async () => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    }));

    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('notifications_sync_channel');
      channel.postMessage({ type: 'MARK_ALL_AS_READ' });
      channel.close();
    }

    try {
      await axios.put('/notifications/read-all', {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      get().fetchNotifications(); // Refresh on error
    }
  },

  clear: () => set({ notifications: [], unreadCount: 0 })
}));

if (window.BroadcastChannel) {
  const syncChannel = new BroadcastChannel('notifications_sync_channel');
  syncChannel.onmessage = (event) => {
    const { type, id } = event.data;
    if (type === 'MARK_AS_READ') {
      useNotificationStore.setState((state) => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } else if (type === 'MARK_ALL_AS_READ') {
      useNotificationStore.setState((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      }));
    }
  };
}

export default useNotificationStore;
