import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Cookie-bootstrap decision logic for ensureAuthSession (GH #90).
 *
 * Environment is node, so `window` is undefined: the login-page early-return and the
 * `window.location.replace` redirect are both inert here. The "redirect" that matters to the
 * router is `clearSession()` (isAuthenticated -> false), which the _authenticated guard turns
 * into a /login navigation; that is what we assert on the failure paths.
 *
 * Each test re-imports auth-session through `vi.resetModules()` so the module-level
 * `authBootstrapComplete` flag starts false and the "fires once" gate is exercised honestly.
 */

const { getSession, token, applyTenantSessionFromAuth } = vi.hoisted(() => ({
  getSession: vi.fn(),
  token: vi.fn(),
  applyTenantSessionFromAuth: vi.fn(),
}));

type Session = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  sessionToken: string | null;
  userId: string | null;
  displayName: string | null;
};

const setSession = vi.fn();
const clearSession = vi.fn();

const authState: Session & { setSession: typeof setSession; clearSession: typeof clearSession } = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: '',
  sessionToken: null,
  userId: null,
  displayName: null,
  setSession,
  clearSession,
};

setSession.mockImplementation((s: Omit<Session, 'isAuthenticated'>) => {
  authState.isAuthenticated = true;
  authState.accessToken = s.accessToken;
  authState.refreshToken = s.refreshToken;
  authState.sessionToken = s.sessionToken;
  authState.userId = s.userId;
  authState.displayName = s.displayName;
});
clearSession.mockImplementation(() => {
  authState.isAuthenticated = false;
  authState.accessToken = null;
  authState.refreshToken = null;
  authState.userId = null;
});

vi.mock('@/lib/auth-client', () => ({
  authClient: { getSession: (...a: unknown[]) => getSession(...a), token: (...a: unknown[]) => token(...a) },
}));
vi.mock('@/lib/tenant-session', () => ({
  applyTenantSessionFromAuth: (...a: unknown[]) => applyTenantSessionFromAuth(...a),
}));
vi.mock('@/lib/authorization-context', () => ({ applyAuthorizationFromLogin: vi.fn() }));
vi.mock('@/lib/auth-me', () => ({ clearAuthMeCache: vi.fn() }));
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => authState,
    persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
  },
}));

async function loadEnsureAuthSession() {
  vi.resetModules();
  const mod = await import('@/lib/auth-session');
  return mod.ensureAuthSession;
}

const okSession = {
  data: { user: { id: 'user-1', name: 'Dr Strange', iq_tenant_id: 'tenant-a' }, session: { token: 'sess-1' } },
  error: null,
};

beforeEach(() => {
  Object.assign(authState, {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: '',
    sessionToken: null,
    userId: null,
    displayName: null,
  });
  getSession.mockReset();
  token.mockReset();
  applyTenantSessionFromAuth.mockReset();
  setSession.mockClear();
  clearSession.mockClear();
  applyTenantSessionFromAuth.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ensureAuthSession cookie bootstrap (GH #90)', () => {
  it('rebuilds the session from a valid cookie and never clears it', async () => {
    getSession.mockResolvedValue(okSession);
    token.mockResolvedValue({ data: { token: 'jwt-access' }, error: null });

    const ensureAuthSession = await loadEnsureAuthSession();
    await ensureAuthSession();

    expect(setSession).toHaveBeenCalledTimes(1);
    expect(setSession).toHaveBeenCalledWith({
      accessToken: 'jwt-access',
      refreshToken: '',
      sessionToken: 'sess-1',
      userId: 'user-1',
      displayName: 'Dr Strange',
    });
    expect(applyTenantSessionFromAuth).toHaveBeenCalledWith({
      accessToken: 'jwt-access',
      authUserIqTenantId: 'tenant-a',
    });
    expect(clearSession).not.toHaveBeenCalled();
    expect(authState.isAuthenticated).toBe(true);
  });

  it('clears the session (-> /login) when the cookie is missing/expired (401)', async () => {
    getSession.mockResolvedValue({ data: null, error: { status: 401, message: 'unauthorized' } });

    const ensureAuthSession = await loadEnsureAuthSession();
    await ensureAuthSession();

    expect(token).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
    expect(applyTenantSessionFromAuth).not.toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(authState.isAuthenticated).toBe(false);
  });

  it('clears the session when the cookie is valid but the JWT mint fails', async () => {
    getSession.mockResolvedValue(okSession);
    token.mockResolvedValue({ data: null, error: { status: 500, message: 'mint failed' } });

    const ensureAuthSession = await loadEnsureAuthSession();
    await ensureAuthSession();

    expect(setSession).not.toHaveBeenCalled();
    expect(applyTenantSessionFromAuth).not.toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(authState.isAuthenticated).toBe(false);
  });

  it('fires the cookie fetch only once across concurrent and repeat calls', async () => {
    getSession.mockResolvedValue(okSession);
    token.mockResolvedValue({ data: { token: 'jwt-access' }, error: null });

    const ensureAuthSession = await loadEnsureAuthSession();
    await Promise.all([ensureAuthSession(), ensureAuthSession()]);
    await ensureAuthSession();

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(token).toHaveBeenCalledTimes(1);
    expect(setSession).toHaveBeenCalledTimes(1);
  });
});
