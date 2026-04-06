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
      // Auth
      user: null,
      setUser: (user) => set({ user, currentPage: user ? ('auth' as PageView) : 'auth' }),
      
      // Navigation
      currentPage: 'auth' as PageView,
      setCurrentPage: (currentPage) => set({ currentPage }),
      
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
        user: state.user,
        currentPage: state.currentPage,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
