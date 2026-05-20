import { authClient } from '@/lib/auth-client';
import { catalogIqTenantHeaderValue, jwtIqTenantHeaderValue } from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

let authBootstrapComplete = false;
let authBootstrapPromise: Promise<void> | null = null;
let authRefreshPromise: Promise<string | null> | null = null;

type ResolvedAuthSession = {
  accessToken: string;
  sessionToken: string;
  userId: string;
  displayName: string;
};

async function resolveAuthSessionFromBetterAuth(): Promise<ResolvedAuthSession | null> {
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
    return null;
  }

  const { data: tokenData, error: tokenError } = await authClient.token();
  const accessToken = tokenData?.token;
  if (tokenError || typeof accessToken !== 'string' || accessToken.length === 0) {
    return null;
  }

  return {
    accessToken,
    sessionToken,
    userId,
    displayName: typeof displayName === 'string' ? displayName : '',
  };
}

/** After reload, tenant store may be empty or hold an EMPI dev placeholder; align to JWT. */
function syncTenantStoreFromAccessToken(accessToken: string): void {
  const jwtTenant = jwtIqTenantHeaderValue(accessToken);
  if (!jwtTenant) return;

  const storeTenant = catalogIqTenantHeaderValue(useTenantStore.getState().tenantId);
  if (storeTenant === jwtTenant) return;

  const prev = useTenantStore.getState();
  useTenantStore.getState().setTenant({
    tenantId: jwtTenant,
    tenantName: prev.tenantName ?? 'Dev Hospital',
    branches:
      prev.branches.length > 0
        ? prev.branches
        : [{ id: 'branch-001', name: 'Main Campus' }],
    activeBranch: prev.activeBranch ?? 'branch-001',
  });
}

function redirectToLoginIfBrowserSessionExpired(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === '/login') {
    return;
  }

  window.location.replace('/login');
}

/**
 * Restores the browser session from better-auth's cookie-backed session before route guards run.
 * JWTs stay in memory; on reload we re-fetch them from the active better-auth session.
 */
export async function ensureAuthSession(): Promise<void> {
  if (authBootstrapComplete) {
    return;
  }

  if (authBootstrapPromise) {
    await authBootstrapPromise;
    return;
  }

  authBootstrapPromise = (async () => {
    try {
      const resolvedSession = await resolveAuthSessionFromBetterAuth();
      if (resolvedSession === null) {
        useAuthStore.getState().clearSession();
        return;
      }

      useAuthStore.getState().setSession(resolvedSession);
      syncTenantStoreFromAccessToken(resolvedSession.accessToken);
    } finally {
      authBootstrapComplete = true;
      authBootstrapPromise = null;
    }
  })();

  await authBootstrapPromise;
}

/**
 * Re-fetches a short-lived JWT from the active better-auth cookie session and updates the auth
 * store. This is used when APIs reject the in-memory JWT after it expires during navigation.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (authRefreshPromise) {
    return authRefreshPromise;
  }

  authRefreshPromise = (async () => {
    try {
      const resolvedSession = await resolveAuthSessionFromBetterAuth();
      if (resolvedSession === null) {
        useAuthStore.getState().clearSession();
        redirectToLoginIfBrowserSessionExpired();
        return null;
      }

      useAuthStore.getState().setSession(resolvedSession);
      syncTenantStoreFromAccessToken(resolvedSession.accessToken);
      return resolvedSession.accessToken;
    } catch {
      useAuthStore.getState().clearSession();
      redirectToLoginIfBrowserSessionExpired();
      return null;
    } finally {
      authRefreshPromise = null;
    }
  })();

  return authRefreshPromise;
}
