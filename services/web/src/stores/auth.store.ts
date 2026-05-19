import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { getRolesFromAccessToken } from '@/lib/access-token';
import { usePermissionsStore } from '@/stores/permissions.store';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  /** better-auth session token — needed for sign-out and JWT refresh. */
  sessionToken: string | null;
  userId: string | null;
  displayName: string | null;
  /** Canonical role codes from the access JWT (`roles` claim), for UX-only shell behavior. */
  roles: string[];

  setSession: (session: {
    accessToken: string;
    sessionToken: string;
    userId: string;
    displayName: string;
  }) => void;
  clearSession: () => void;
}

const authSlice: StateCreator<AuthState> = (set) => ({
  isAuthenticated: false,
  accessToken: null,
  sessionToken: null,
  userId: null,
  displayName: null,
  roles: [],

  setSession: (session) => {
    // Always decode from JWT — never trust a separately persisted `roles` array.
    const roles = getRolesFromAccessToken(session.accessToken);
    set({
      isAuthenticated: true,
      accessToken: session.accessToken,
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
      sessionToken: null,
      userId: null,
      displayName: null,
      roles: [],
    });
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
    })
  : authSlice;

export const useAuthStore = create<AuthState>()(
  devtools(
    authStoreCreator as unknown as StateCreator<AuthState, [['zustand/devtools', never]]>,
    { name: 'auth' },
  ),
);
