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

async function ensureAuthStoreRehydrated(): Promise<void> {
  if (storeRehydrated) {
    return;
  }
  const store = useAuthStore;
  if ('persist' in store && typeof store.persist.rehydrate === 'function') {
    await store.persist.rehydrate();
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

      if (!auth.isAuthenticated || !auth.refreshToken?.trim() || !auth.userId) {
        useAuthStore.getState().clearSession();
        return;
      }
      if (isAccessTokenUsable(auth.accessToken)) {
        await hydrateTenantFromAccessToken(auth.accessToken!);
        return;
      }
      const accessToken = await refreshStoredAccessToken();
      if (accessToken === null) {
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
