import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo, PageView, ChatMessage } from './types';

interface AppState {
  // Auth
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
  
  // Navigation
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;

  // Active meeting (Grada Vio)
  activeMeetingId: string | null;
  setActiveMeeting: (id: string | null) => void;

  // Session (JWT in HTTP-only cookie; user kept in memory only)
  hydrateSession: () => Promise<void>;
  logout: () => Promise<void>;
  
  // Chat
  chatMessages: Record<string, ChatMessage[]>;
  addChatMessage: (key: string, message: ChatMessage) => void;
  clearChatMessages: (key: string) => void;
  
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth - do NOT override currentPage when setting user
      user: null,
      setUser: (user) => set({ user }),
      
      // Navigation
      currentPage: 'auth' as PageView,
      setCurrentPage: (currentPage) => set({ currentPage }),

      // Active meeting
      activeMeetingId: null,
      setActiveMeeting: (activeMeetingId) => set({ activeMeetingId }),

      // Session
      hydrateSession: async () => {
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              set({ user: data.user });
              return;
            }
          }
          // Access token expiré ou absent : tenter un rafraîchissement via le refresh token
          const refreshed = await fetch('/api/auth/refresh', { method: 'POST' });
          if (refreshed.ok) {
            const data = await refreshed.json();
            if (data.user) set({ user: data.user });
          }
        } catch {
          /* session absente ou réseau indisponible */
        }
      },
      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {
          /* ignore */
        }
        set({ user: null, activeMeetingId: null, currentPage: 'auth' });
      },
      
      // Chat
      chatMessages: {},
      addChatMessage: (key, message) =>
        set((state) => ({
          chatMessages: {
            ...state.chatMessages,
            [key]: [...(state.chatMessages[key] || []), message],
          },
        })),
      clearChatMessages: (key) =>
        set((state) => ({
          chatMessages: { ...state.chatMessages, [key]: [] },
        })),
      
      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: 'gradeup-storage',
      partialize: (state) => ({
        currentPage: state.currentPage,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
