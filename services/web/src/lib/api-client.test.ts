import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const refreshAccessTokenMock = vi.fn<() => Promise<string | null>>();

vi.mock('@/lib/auth-session', () => ({
  refreshAccessToken: () => refreshAccessTokenMock(),
}));

import { apiClient, resolveEffectiveTenantId } from './api-client';

const DEV_TENANT = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
const OTHER_TENANT = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

describe('resolveEffectiveTenantId', () => {
  beforeEach(() => {
    useTenantStore.getState().setTenantContext({
      homeTenantId: DEV_TENANT,
      tenantId: DEV_TENANT,
      tenantName: 'Dev',
      branches: [{ id: 'b1', name: 'Main' }],
      activeBranch: 'b1',
    });
  });

  it('uses store tenant when context is omitted', () => {
    expect(resolveEffectiveTenantId()).toBe(DEV_TENANT);
  });

  it('uses tenantIdOverride when set', () => {
    expect(resolveEffectiveTenantId({ tenantIdOverride: OTHER_TENANT })).toBe(OTHER_TENANT);
  });

  it('omits tenant when tenantIdOverride is null', () => {
    expect(resolveEffectiveTenantId({ tenantIdOverride: null })).toBeNull();
  });
});

describe('apiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    refreshAccessTokenMock.mockReset();
    useAuthStore.getState().setSession({
      accessToken: 'token-1',
      sessionToken: 'session-1',
      userId: 'user-1',
      displayName: 'Test',
    });
    useTenantStore.getState().setTenantContext({
      homeTenantId: DEV_TENANT,
      tenantId: DEV_TENANT,
      tenantName: 'Dev',
      branches: [{ id: 'b1', name: 'Main' }],
      activeBranch: 'b1',
    });
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends Authorization and iq_tenant_id for user-management requests', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await apiClient('/api/user-management/users', { method: 'GET' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-1');
    expect(headers.get('iq_tenant_id')).toBe(DEV_TENANT);
    expect(headers.get('x-tenant-id')).toBe(DEV_TENANT);
  });

  it('applies tenantIdOverride for cross-tenant super-admin calls', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await apiClient(
      '/api/user-management/users',
      { method: 'GET' },
      { tenantIdOverride: OTHER_TENANT },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('iq_tenant_id')).toBe(OTHER_TENANT);
    expect(headers.get('x-tenant-id')).toBe(OTHER_TENANT);
  });

  it('omits tenant headers when tenantIdOverride is null', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'T' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient(
      `/api/configurator/v1/tenants/${OTHER_TENANT}`,
      { method: 'GET' },
      { tenantIdOverride: null },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has('iq_tenant_id')).toBe(false);
    expect(headers.has('x-tenant-id')).toBe(false);
  });

  it('omits iq_tenant_id for global_master catalog reads while a tenant is selected', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient(
      '/api/v1/master-data/modules',
      { method: 'GET' },
      { tenantIdOverride: null },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has('iq_tenant_id')).toBe(false);
    expect(headers.has('x-tenant-id')).toBe(false);
  });

  it('retries once with refreshed token and preserves tenant override on retry', async () => {
    refreshAccessTokenMock.mockImplementation(async () => {
      useAuthStore.getState().setSession({
        accessToken: 'token-2',
        sessionToken: 'session-1',
        userId: 'user-1',
        displayName: 'Test',
      });
      return 'token-2';
    });

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'AUTH_INVALID_TOKEN' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );

    await apiClient(
      '/api/user-management/roles',
      { method: 'GET' },
      { tenantIdOverride: OTHER_TENANT },
    );

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, retryInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const retryHeaders = new Headers(retryInit.headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer token-2');
    expect(retryHeaders.get('iq_tenant_id')).toBe(OTHER_TENANT);
    expect(retryHeaders.get('x-tenant-id')).toBe(OTHER_TENANT);
  });
});
