import type { QueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { clearAuthMeCache } from '@/lib/auth-me';
import { decodeAccessTokenPayload } from '@/lib/access-token';
import type { AuthPrincipalResponse } from '@/lib/auth-principal';
import { applyAuthorizationFromLogin } from '@/lib/authorization-context';
import { resolveBrowserApiBaseUrl } from '@/lib/api-base-url';
import { applyTenantSessionFromAuth } from '@/lib/tenant-session';
import { catalogIqTenantHeaderValue, jwtIqTenantHeaderValue } from '@/lib/catalog-tenant';
import type { UmUser } from '@/features/user-management/types';
import { parseAccessJwtClaims } from '@/lib/jwt-claims';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const BASE_URL = resolveBrowserApiBaseUrl();

export type InteractiveLoginResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  session_token: string;
  tenant_id: string;
  user: UmUser;
  principal: AuthPrincipalResponse;
};

let authBootstrapComplete = false;
let authBootstrapPromise: Promise<void> | null = null;
let authRefreshPromise: Promise<string | null> | null = null;
let storeRehydrated = false;

function isAccessTokenUsable(accessToken: string | null | undefined, skewSeconds = 60): boolean {
  if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    return false;
  }
  const exp = decodeAccessTokenPayload(accessToken)?.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    return true;
  }
  return exp > Math.floor(Date.now() / 1000) + skewSeconds;
}

/** Subset of zustand's persist store API we rely on (mutator type is erased at the store's devtools cast). */
type PersistApi = { rehydrate: () => Promise<void> | void };

function hasPersistApi(store: unknown): store is { persist: PersistApi } {
  return (
    typeof store === 'object' &&
    store !== null &&
    'persist' in store &&
    typeof (store as { persist?: { rehydrate?: unknown } }).persist?.rehydrate === 'function'
  );
}

async function ensureAuthStoreRehydrated(): Promise<void> {
  if (storeRehydrated) {
    return;
  }
  if (hasPersistApi(useAuthStore)) {
    await useAuthStore.persist.rehydrate();
  }
  storeRehydrated = true;
}

function syncTenantStoreFromAccessToken(accessToken: string): void {
  if (!import.meta.env.DEV) return;

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
  if (typeof window === 'undefined' || window.location.pathname === '/login') {
    return;
  }
  window.location.replace('/login');
}

async function hydrateTenantFromAccessToken(accessToken: string): Promise<void> {
  const claims = parseAccessJwtClaims(accessToken);
  await applyTenantSessionFromAuth({
    accessToken,
    authUserIqTenantId: claims.iq_tenant_id ?? null,
    preferredActiveTenantId: useTenantStore.getState().tenantId,
  });
  syncTenantStoreFromAccessToken(accessToken);
}

async function refreshPlatformAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/token`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${refreshToken.trim()}` },
    credentials: 'include',
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text.length > 0 ? text : `Token refresh failed (${response.status})`);
  }
  const parsed = JSON.parse(text) as { token?: unknown };
  const accessToken = typeof parsed.token === 'string' ? parsed.token.trim() : '';
  if (accessToken.length === 0) {
    throw new Error('Token refresh returned an empty access token');
  }
  return accessToken;
}

/**
 * Cold-start session bootstrap from the better-auth cookie (GH #90).
 *
 * Prod cookie sessions carry no refresh token (login.tsx sets `refreshToken: ''`), so a hard
 * refresh has nothing in memory to restore and the old code stranded the user at /login even
 * while the better-auth session cookie was still valid. Instead we rebuild the session straight
 * off that cookie, mirroring exactly what login does:
 *   1. get-session -> platform identity (id / name / iq_tenant_id), cookie-only
 *   2. token       -> a fresh 5-min RS256 access JWT minted off the same cookie
 * then feed both through the same functions login uses (`setSession` +
 * `applyTenantSessionFromAuth`). Principal/capability hydration then runs — as it does for a
 * normal reload — via the unchanged `_authenticated` guard's `refreshAuthorizationContext`.
 *
 * A missing/expired cookie makes get-session (or token) return an error/empty body; we return
 * false and the caller clears the session, so the router falls through to the /login redirect.
 * No new access token or principal is written to web storage — the cookie is the only durable
 * credential and it is owned by the browser, not by us.
 */
async function bootstrapSessionFromCookie(): Promise<boolean> {
  const sessionResult = await authClient.getSession();
  const sessionData = sessionResult.data as
    | { user?: { id?: string; name?: string; iq_tenant_id?: string }; session?: { token?: string } }
    | null;
  const user = sessionData?.user;
  const userId = typeof user?.id === 'string' ? user.id.trim() : '';
  if (sessionResult.error || userId.length === 0) {
    return false;
  }

  const tokenResult = await authClient.token();
  const accessToken =
    typeof tokenResult.data?.token === 'string' ? tokenResult.data.token.trim() : '';
  if (tokenResult.error || accessToken.length === 0) {
    return false;
  }

  // Mirror login.tsx completeSignIn: cookie sessions issue no refresh token ('' disables the
  // silent-refresh path); the cookie itself is the durable credential we re-mint the JWT from.
  useAuthStore.getState().setSession({
    accessToken,
    refreshToken: '',
    sessionToken: typeof sessionData?.session?.token === 'string' ? sessionData.session.token : '',
    userId,
    displayName: user?.name ?? '',
  });

  await applyTenantSessionFromAuth({
    accessToken,
    authUserIqTenantId: user?.iq_tenant_id ?? null,
  });
  return true;
}

async function refreshStoredAccessToken(): Promise<string | null> {
  const auth = useAuthStore.getState();
  const refreshToken = auth.refreshToken?.trim();
  if (!refreshToken || !auth.userId) {
    return null;
  }

  if (isAccessTokenUsable(auth.accessToken)) {
    return auth.accessToken;
  }

  const accessToken = await refreshPlatformAccessToken(refreshToken);
  useAuthStore.getState().setSession({
    accessToken,
    refreshToken,
    sessionToken: auth.sessionToken ?? '',
    userId: auth.userId,
    displayName: auth.displayName ?? '',
  });
  await hydrateTenantFromAccessToken(accessToken);
  return accessToken;
}

export async function loginWithCredentials(input: {
  identifier: string;
  password: string;
}): Promise<InteractiveLoginResponse> {
  const response = await fetch(`${BASE_URL}/api/user-management/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      identifier: input.identifier.trim(),
      password: input.password,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text.length > 0 ? text : `Login failed (${response.status})`);
  }
  return JSON.parse(text) as InteractiveLoginResponse;
}

export async function completeInteractiveLogin(
  queryClient: QueryClient,
  login: InteractiveLoginResponse,
): Promise<void> {
  useAuthStore.getState().setSession({
    accessToken: login.access_token,
    refreshToken: login.refresh_token,
    sessionToken: login.session_token,
    userId: login.user.id,
    displayName: login.user.full_name,
    mustChangePassword: login.user.must_change_password === true,
  });
  authBootstrapComplete = true;
  authBootstrapPromise = null;

  await applyTenantSessionFromAuth({
    accessToken: login.access_token,
    authUserIqTenantId: login.tenant_id,
  });
  await applyAuthorizationFromLogin(queryClient, login.principal);
}

export async function forceLogoutDueToAccountDisabled(): Promise<void> {
  authBootstrapComplete = false;
  authBootstrapPromise = null;
  clearAuthMeCache();
  useAuthStore.getState().clearSession();
  try {
    await authClient.signOut();
  } catch {
    /* best-effort */
  }
  redirectToLoginIfBrowserSessionExpired();
}

function isAccountDisabledTokenError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') {
    return false;
  }
  const status = (error as { status?: unknown }).status;
  const message = (error as { message?: unknown }).message;
  return (
    status === 403 &&
    typeof message === 'string' &&
    message.toLowerCase().includes('deactivated')
  );
}

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
      await ensureAuthStoreRehydrated();
      const auth = useAuthStore.getState();

      // Login page uses POST /auth/login — do not silently refresh here.
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        return;
      }

      // Refresh-token-backed session (dev / legacy POST-login): restore without a cookie
      // round-trip. Prod cookie sessions have `refreshToken === ''`, so this branch is skipped
      // and we fall through to the cookie bootstrap below.
      if (auth.isAuthenticated && auth.refreshToken?.trim() && auth.userId) {
        if (isAccessTokenUsable(auth.accessToken)) {
          await hydrateTenantFromAccessToken(auth.accessToken!);
          return;
        }
        const accessToken = await refreshStoredAccessToken();
        if (accessToken !== null) {
          return;
        }
        // Refresh token no longer valid — fall through to the cookie bootstrap.
      }

      // Cold start / hard refresh: rebuild the session from the better-auth cookie (GH #90).
      // Cookie absent/expired -> false -> clearSession -> the router redirects to /login.
      const bootstrapped = await bootstrapSessionFromCookie();
      if (!bootstrapped) {
        useAuthStore.getState().clearSession();
      }
    } catch (error) {
      useAuthStore.getState().clearSession();
      if (isAccountDisabledTokenError(error)) {
        await forceLogoutDueToAccountDisabled();
      }
    } finally {
      authBootstrapComplete = true;
      authBootstrapPromise = null;
    }
  })();

  await authBootstrapPromise;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (authRefreshPromise) {
    return authRefreshPromise;
  }

  authRefreshPromise = (async () => {
    try {
      const accessToken = await refreshStoredAccessToken();
      if (accessToken === null) {
        useAuthStore.getState().clearSession();
        redirectToLoginIfBrowserSessionExpired();
        return null;
      }
      return accessToken;
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
