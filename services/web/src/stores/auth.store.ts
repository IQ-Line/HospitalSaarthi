import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { usePermissionsStore } from '@/stores/permissions.store';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  /** better-auth session token — needed for sign-out and JWT refresh. */
  sessionToken: string | null;
  userId: string | null;
  displayName: string | null;

  setSession: (session: {
    accessToken: string;
    sessionToken: string;
    userId: string;
    displayName: string;
  }) => void;
  clearSession: () => void;
}

const authSlice: StateCreator<AuthState> = (set, get) => ({
  isAuthenticated: false,
  accessToken: null,
  sessionToken: null,
  userId: null,
  displayName: null,

  setSession: (session) => {
    if (get().userId !== session.userId) {
      usePermissionsStore.getState().clearPermissions();
    }
    set(
      {
        isAuthenticated: true,
        accessToken: session.accessToken,
        sessionToken: session.sessionToken,
        userId: session.userId,
        displayName: session.displayName,
      },
      false,
      'setSession',
    );
  },

  clearSession: () => {
    usePermissionsStore.getState().clearPermissions();
    set(
      {
        isAuthenticated: false,
        accessToken: null,
        sessionToken: null,
        userId: null,
        displayName: null,
      },
      false,
      'clearSession',
    );
  },
});

const authStoreCreator = import.meta.env.DEV
  ? persist(authSlice, {
      name: 'hims-dev-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        accessToken: s.accessToken,
        sessionToken: s.sessionToken,
        userId: s.userId,
        displayName: s.displayName,
      }),
    })
  : authSlice;

export const useAuthStore = create<AuthState>()(devtools(authStoreCreator, { name: 'auth' }));
