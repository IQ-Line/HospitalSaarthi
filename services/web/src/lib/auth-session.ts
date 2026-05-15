import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/stores/auth.store';

let authBootstrapComplete = false;
let authBootstrapPromise: Promise<void> | null = null;

/**
 * Restores the browser session from better-auth's cookie-backed session before route guards run.
 * JWTs stay in memory; on reload we re-fetch them from the active better-auth session.
 */
export async function ensureAuthSession(): Promise<void> {
  if (useAuthStore.getState().isAuthenticated) {
    authBootstrapComplete = true;
    return;
  }

  if (authBootstrapComplete) {
    return;
  }

  if (authBootstrapPromise) {
    await authBootstrapPromise;
    return;
  }

  authBootstrapPromise = (async () => {
    try {
      const { data: sessionData, error: sessionError } = await authClient.getSession();
      const sessionToken = sessionData?.session?.token;
      const userId = sessionData?.user?.id;
      const displayName = sessionData?.user?.name;

      if (
        sessionError ||
        typeof sessionToken !== 'string' ||
        sessionToken.length === 0 ||
        typeof userId !== 'string' ||
        userId.length === 0
      ) {
        useAuthStore.getState().clearSession();
        return;
      }

      const { data: tokenData, error: tokenError } = await authClient.token();
      const accessToken = tokenData?.token;
      if (tokenError || typeof accessToken !== 'string' || accessToken.length === 0) {
        useAuthStore.getState().clearSession();
        return;
      }

      useAuthStore.getState().setSession({
        accessToken,
        sessionToken,
        userId,
        displayName: typeof displayName === 'string' ? displayName : '',
      });
    } finally {
      authBootstrapComplete = true;
      authBootstrapPromise = null;
    }
  })();

  await authBootstrapPromise;
}
