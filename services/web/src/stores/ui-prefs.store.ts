import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIPrefsState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';

  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIPrefsStore = create<UIPrefsState>()(
  devtools(
    persist(
      (set, get) => ({
        sidebarCollapsed: false,
        theme: 'system',

        toggleSidebar: () =>
          set({ sidebarCollapsed: !get().sidebarCollapsed }, false, 'toggleSidebar'),

        setTheme: (theme) => set({ theme }, false, 'setTheme'),
      }),
      { name: 'hims-ui-prefs' },
    ),
    { name: 'ui-prefs' },
  ),
);
