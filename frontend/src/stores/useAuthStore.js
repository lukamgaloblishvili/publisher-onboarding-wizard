import { create } from "zustand";
import { api } from "../api/client";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  initialized: false,
  async initialize() {
    if (useAuthStore.getState().initialized) {
      return useAuthStore.getState().user;
    }
    try {
      const user = await api.me();
      set({ user, loading: false, initialized: true });
      return user;
    } catch {
      set({ user: null, loading: false, initialized: true });
      return null;
    }
  },
  async loginAdmin(credentials) {
    const user = await api.loginAdmin(credentials);
    set({ user, loading: false, initialized: true });
    return user;
  },
  async loginPublisher(payload) {
    const user = await api.loginPublisher(payload);
    set({ user, loading: false, initialized: true });
    return user;
  },
  async logout() {
    await api.logout();
    set({ user: null, loading: false, initialized: true });
  }
}));
