import { create } from 'zustand';

const TOAST_DURATION_MS = 3000;

export const useToastStore = create((set, get) => ({
  toasts: [],

  /** @param {string} message @param {'success' | 'error' | 'info'} [type] @param {number} [duration] */
  showToast: (message, type = 'success', duration = TOAST_DURATION_MS) => {
    const currentToasts = get().toasts;
    if (currentToasts.some(t => t.message === message && t.type === type)) {
      return null;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    set({ toasts: [...currentToasts, { id, message, type, duration }] });

    window.setTimeout(() => {
      set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
    }, duration);

    return id;
  },

  /** @param {string} id */
  removeToast: (id) => {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
}));
