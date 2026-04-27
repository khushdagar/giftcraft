import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms, 0 = no auto-dismiss
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>()(
  devtools(
    (set) => ({
      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).substring(7);
        const newToast: Toast = {
          ...toast,
          id,
          duration: toast.duration ?? 5000,
        };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-dismiss after duration
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            set((state) => ({
              toasts: state.toasts.filter((t) => t.id !== id),
            }));
          }, newToast.duration);
        }

        return id;
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      clearAll: () => set({ toasts: [] }),
    }),
    { name: 'toast-store' }
  )
);

// Helper functions for convenience
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({
      type: 'success',
      message,
      duration,
    }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({
      type: 'error',
      message,
      duration,
    }),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({
      type: 'info',
      message,
      duration,
    }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast({
      type: 'warning',
      message,
      duration,
    }),
};
