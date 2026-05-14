import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userId: string | null;
  displayName: string | null;

  setSession: (session: { accessToken: string; userId: string; displayName: string }) => void;
  clearSession: () => void;
}

const authSlice: StateCreator<AuthState> = (set) => ({
  isAuthenticated: false,
  accessToken: null,
  userId: null,
  displayName: null,

  setSession: (session) =>
    set(
      {
        isAuthenticated: true,
        accessToken: session.accessToken,
        userId: session.userId,
        displayName: session.displayName,
      },
      false,
      'setSession',
    ),

  clearSession: () =>
    set(
      {
        isAuthenticated: false,
        accessToken: null,
        userId: null,
        displayName: null,
      },
      false,
      'clearSession',
    ),
});

const authStoreCreator = import.meta.env.DEV
  ? persist(authSlice, {
      name: 'hims-dev-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        accessToken: s.accessToken,
        userId: s.userId,
        displayName: s.displayName,
      }),
    })
  : authSlice;

export const useAuthStore = create<AuthState>()(devtools(authStoreCreator, { name: 'auth' }));
