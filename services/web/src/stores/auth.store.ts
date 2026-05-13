import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
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

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      sessionToken: null,
      userId: null,
      displayName: null,

      setSession: (session) =>
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
        ),

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
    }),
    { name: 'auth' },
  ),
);
