import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  isDarkMode: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  toggleMobile: () => void;
  setMobileOpen: (v: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
}

const syncDarkModeClass = (isDark: boolean) => {
  if (typeof window !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

export const useSidebarStore = create<UIState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      isDarkMode: false,
      toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (v) => set({ isCollapsed: v }),
      toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
      setMobileOpen: (v) => set({ isMobileOpen: v }),
      toggleDarkMode: () =>
        set((state) => {
          const newDark = !state.isDarkMode;
          syncDarkModeClass(newDark);
          return { isDarkMode: newDark };
        }),
      setDarkMode: (v) => {
        syncDarkModeClass(v);
        set({ isDarkMode: v });
      },
    }),
    {
      name: 'vireon-ui-store',
      partialize: (state) => ({ isCollapsed: state.isCollapsed, isDarkMode: state.isDarkMode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncDarkModeClass(state.isDarkMode);
        }
      },
    }
  )
);
