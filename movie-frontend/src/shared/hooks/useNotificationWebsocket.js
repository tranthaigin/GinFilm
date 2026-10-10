import { useEffect, useRef } from 'react';
import useNotificationStore from '../store/notificationStore';
import { useAuthStore } from '../../features/user/store/authStore';
import env from '../config/env';

export const useNotificationWebsocket = () => {
  const stompClientRef = useRef(null);
  const connectionAttemptRef = useRef(0);
  const disconnectPromiseRef = useRef(Promise.resolve());
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const addNotification = useNotificationStore(state => state.addNotification);
  const fetchNotifications = useNotificationStore(state => state.fetchNotifications);
  const clearNotifications = useNotificationStore(state => state.clear);
  const userIdentity = user?.id ?? user?.email ?? user?.username ?? null;
  const hasLoadedRoles = Boolean(user?.roles || user?.role || user?.authorities);

  useEffect(() => {
    const attemptId = ++connectionAttemptRef.current;
    let disposed = false;
    let client = null;

    const disconnect = (clientToDisconnect) => {
      if (!clientToDisconnect) return;

      if (stompClientRef.current === clientToDisconnect) {
        stompClientRef.current = null;
      }

      disconnectPromiseRef.current = Promise.resolve(clientToDisconnect.deactivate())
        .catch(() => undefined);
    };

    // Wait until /me has supplied the authenticated user and their roles.
    if (!isAuthenticated || !userIdentity || !hasLoadedRoles) {
      if (!isAuthenticated || !userIdentity) {
        clearNotifications();
      }
      disconnect(stompClientRef.current);
      return;
    }

    // REST remains the source of truth for notifications missed while disconnected.
    fetchNotifications();

    const connect = async () => {
      // If a previous authenticated session is still closing, do not overlap sockets.
      await disconnectPromiseRef.current;

      const [{ Client }, sockJsModule] = await Promise.all([
        import('@stomp/stompjs'),
        import('sockjs-client'),
      ]);

      if (disposed || connectionAttemptRef.current !== attemptId) return;

      const SockJS = sockJsModule.default ?? sockJsModule;
      client = new Client({
        webSocketFactory: () => new SockJS(env.wsUrl, null, { withCredentials: true }),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      client.onConnect = () => {
        if (disposed || stompClientRef.current !== client) return;

        client.subscribe('/user/queue/notifications', (message) => {
          if (disposed || stompClientRef.current !== client || !message.body) return;

          try {
            addNotification(JSON.parse(message.body));
          } catch (error) {
            console.error('Invalid notification payload:', error);
          }
        });
      };

      client.onStompError = (frame) => {
        if (disposed || stompClientRef.current !== client) return;
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      };

      stompClientRef.current = client;
      client.activate();
    };

    connect().catch((error) => {
      if (!disposed && connectionAttemptRef.current === attemptId) {
        console.error('Unable to initialize notification WebSocket:', error);
      }
    });

    return () => {
      disposed = true;
      if (connectionAttemptRef.current === attemptId) {
        connectionAttemptRef.current += 1;
      }
      disconnect(client);
    };
  }, [
    isAuthenticated,
    userIdentity,
    hasLoadedRoles,
    addNotification,
    fetchNotifications,
    clearNotifications,
  ]);
};
