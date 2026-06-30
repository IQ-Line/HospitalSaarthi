import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { getRolesFromAccessToken } from '@/lib/access-token';
import { usePermissionsStore } from '@/stores/permissions.store';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  /** Platform refresh token (7d) — used to mint new access JWTs without better-auth getSession. */
  refreshToken: string | null;
  /** better-auth session token — used for sign-out. */
  sessionToken: string | null;
  userId: string | null;
  displayName: string | null;
  /** Canonical role codes from the access JWT (`roles` claim), for UX-only shell behavior. */
  roles: string[];

  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    sessionToken: string;
    userId: string;
    displayName: string;
  }) => void;
  clearSession: () => void;
}

const authSlice: StateCreator<AuthState> = (set, get) => ({
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  sessionToken: null,
  userId: null,
  displayName: null,
  roles: [],

  setSession: (session) => {
    if (get().userId !== session.userId) {
      usePermissionsStore.getState().clearPermissions();
    }
    const roles = getRolesFromAccessToken(session.accessToken);
    set({
      isAuthenticated: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      sessionToken: session.sessionToken,
      userId: session.userId,
      displayName: session.displayName,
      roles,
    });
  },

  clearSession: () => {
    usePermissionsStore.getState().clearPermissions();
    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      sessionToken: null,
      userId: null,
      displayName: null,
      roles: [],
    });
  },
});

const authStoreCreator = persist(authSlice, {
  name: 'hims-auth-session',
  storage: createJSONStorage(() => sessionStorage),
  partialize: (s) => ({
    isAuthenticated: s.isAuthenticated,
    refreshToken: s.refreshToken,
    sessionToken: s.sessionToken,
    userId: s.userId,
    displayName: s.displayName,
    accessToken: s.accessToken,
    roles: s.roles,
  }),
  merge: (persisted, current) => {
    const merged = { ...current, ...(persisted as Partial<AuthState>) };
    if (merged.accessToken) {
      merged.roles = getRolesFromAccessToken(merged.accessToken);
    }
    return merged;
  },
  onRehydrateStorage: () => (state) => {
    if (state?.accessToken) {
      state.roles = getRolesFromAccessToken(state.accessToken);
    }
  },
});

export const useAuthStore = create<AuthState>()(
  devtools(
    authStoreCreator as unknown as StateCreator<AuthState, [['zustand/devtools', never]]>,
    { name: 'auth' },
  ),
);
