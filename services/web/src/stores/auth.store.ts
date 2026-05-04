import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userId: string | null;
  displayName: string | null;

  setSession: (session: { accessToken: string; userId: string; displayName: string }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
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
    }),
    { name: 'auth' },
  ),
);
