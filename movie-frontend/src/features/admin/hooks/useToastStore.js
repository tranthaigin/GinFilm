import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const currentToasts = get().toasts;
    // Chống trùng lặp thông báo giống nhau
    if (currentToasts.some(t => t.message === toast.message && t.type === toast.type)) {
      return null;
    }

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    
    // Auto remove after 5 seconds if not specified
    const duration = toast.duration || 5000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
