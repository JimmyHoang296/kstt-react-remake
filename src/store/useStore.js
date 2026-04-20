import { create } from 'zustand';

const useStore = create((set) => ({
  data: {
    user: {},
    cases: [],
    violations: [],
    visitPlan: [],
    calendar: [],
    emps: [],
    setup: {},
  },
  isLogin: false,
  isSidebarOpen: window.innerWidth >= 1024,
  toasts: [],

  setIsLogin: (status) => set({ isLogin: status }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setData: (updater) =>
    set((state) => ({
      data:
        typeof updater === 'function'
          ? updater(state.data)
          : { ...state.data, ...updater },
    })),

  addToast: (message, type = 'success') =>
    set((state) => ({
      toasts: [...state.toasts, { id: Date.now(), message, type }],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export default useStore;
