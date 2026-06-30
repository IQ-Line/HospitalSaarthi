import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const refreshAccessTokenMock = vi.fn<() => Promise<string | null>>();

vi.mock('@/lib/auth-session', () => ({
  refreshAccessToken: () => refreshAccessTokenMock(),
}));

import { apiClient, apiClientGlobalCatalogRead, resolveEffectiveTenantId } from './api-client';

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

  it('uses seed tenant for billing when store holds EMPI dev placeholder and JWT lacks claim', async () => {
    const SEED_TENANT = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
    const EMPI_PLACEHOLDER = '550e8400-e29b-41d4-a716-446655440001';
    useTenantStore.getState().setTenantContext({
      homeTenantId: EMPI_PLACEHOLDER,
      tenantId: EMPI_PLACEHOLDER,
      tenantName: 'Stale',
      branches: [{ id: 'b1', name: 'Main' }],
      activeBranch: 'b1',
    });
    useAuthStore.getState().setSession({
      accessToken: 'not-a-jwt',
      sessionToken: 'session-1',
      userId: 'user-1',
      displayName: 'Test',
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ bill_id: 'b1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient('/api/billing/v1/charges', {
      method: 'POST',
      body: JSON.stringify({ item_code: 'REG_FEE' }),
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('iq_tenant_id')).toBe(SEED_TENANT);
    expect(headers.get('x-tenant-id')).toBe(SEED_TENANT);
  });

  it('overrides stale catalog tenant header on billing routes', async () => {
    const SEED_TENANT = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
    const EMPI_PLACEHOLDER = '550e8400-e29b-41d4-a716-446655440001';

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient(
      '/api/billing/v1/tariff-master',
      {
        method: 'GET',
        headers: { iq_tenant_id: EMPI_PLACEHOLDER, 'x-tenant-id': EMPI_PLACEHOLDER },
      },
      { tenantIdOverride: EMPI_PLACEHOLDER },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('iq_tenant_id')).toBe(SEED_TENANT);
    expect(headers.get('x-tenant-id')).toBe(SEED_TENANT);
  });

  it('omits iq_tenant_id for visitpad catalog when principal is platform super-admin', async () => {
    useAuthStore.setState({ roles: ['super-admin'] });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient('/api/v1/master-data/visitpad/units?limit=20&offset=0', { method: 'GET' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has('iq_tenant_id')).toBe(false);
    expect(headers.has('x-tenant-id')).toBe(false);
  });

  it('omits iq_tenant_id for departments catalog when principal is platform super-admin', async () => {
    useAuthStore.setState({ roles: ['super-admin'] });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient('/api/v1/master-data/departments', { method: 'GET' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has('iq_tenant_id')).toBe(false);
    expect(headers.has('x-tenant-id')).toBe(false);
  });

  it('sends iq_tenant_id for inventory catalog when principal is platform super-admin', async () => {
    useAuthStore.setState({ roles: ['super-admin'] });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient('/api/v1/master-data/inventory/uoms?limit=50&offset=0', { method: 'GET' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('iq_tenant_id')).toBe(DEV_TENANT);
    expect(headers.get('x-tenant-id')).toBe(DEV_TENANT);
  });

  it('sends iq_tenant_id for visitpad catalog when super-admin passes tenantIdOverride', async () => {
    useAuthStore.setState({ roles: ['super-admin'] });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient(
      '/api/v1/master-data/visitpad/manufacturers?limit=50&offset=0',
      { method: 'GET' },
      { tenantIdOverride: DEV_TENANT },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('iq_tenant_id')).toBe(DEV_TENANT);
    expect(headers.get('x-tenant-id')).toBe(DEV_TENANT);
  });

  it('sends iq_tenant_id for visitpad catalog when principal is tenant-admin', async () => {
    useAuthStore.setState({ roles: ['tenant-admin'] });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient('/api/v1/master-data/visitpad/vitals?limit=20&offset=0', { method: 'GET' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('iq_tenant_id')).toBe(DEV_TENANT);
    expect(headers.get('x-tenant-id')).toBe(DEV_TENANT);
  });

  it('sends iq_tenant_id on visitpad import-from-platform POST for tenant-admin', async () => {
    useAuthStore.setState({ roles: ['tenant-admin'] });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { created: [], skipped: [], errors: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient('/api/v1/master-data/visitpad/units/import-from-platform', {
      method: 'POST',
      body: JSON.stringify({ platform_row_ids: ['00000000-0000-0000-0000-000000000001'] }),
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('iq_tenant_id')).toBe(DEV_TENANT);
    expect(headers.get('x-tenant-id')).toBe(DEV_TENANT);
  });

  it('omits iq_tenant_id on visitpad import-from-platform POST for platform super-admin', async () => {
    useAuthStore.setState({ roles: ['super-admin'] });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { created: [], skipped: [], errors: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClient('/api/v1/master-data/visitpad/medicines/import-from-platform', {
      method: 'POST',
      body: JSON.stringify({ platform_row_ids: ['00000000-0000-0000-0000-000000000002'] }),
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has('iq_tenant_id')).toBe(false);
    expect(headers.has('x-tenant-id')).toBe(false);
  });

  it('omits iq_tenant_id for visitpad global library GET during tenant import modal', async () => {
    useAuthStore.setState({ roles: ['tenant-admin'] });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiClientGlobalCatalogRead('/api/v1/master-data/visitpad/diagnoses?limit=50&offset=0');

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

    await apiClient('/api/v1/master-data/modules', { method: 'GET' }, { tenantIdOverride: null });

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
