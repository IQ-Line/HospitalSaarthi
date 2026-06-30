import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getRendererAuthHeaders } from './renderer-host-bootstrap';
import { PAGE_BUILDER_CLIENT_ID } from '@/lib/lc-nc-config';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
vi.mock('iq-line-form-builder-renderer', () => ({
  bootstrapRendererHost: vi.fn(),
  resetRendererHostAuth: vi.fn(),
  getClientId: () => null,
}));

describe('getRendererAuthHeaders', () => {
  beforeEach(() => {
    useAuthStore.setState({      accessToken: 'token-abc',
      userId: 'user-1',
    } as Partial<ReturnType<typeof useAuthStore.getState>>);
    useTenantStore.setState({
      tenantId: 'tenant-1',
    } as Partial<ReturnType<typeof useTenantStore.getState>>);
  });

  it('includes bearer token, client, user, and tenant headers', () => {
    const headers = getRendererAuthHeaders();
    expect(headers.Authorization).toBe('Bearer token-abc');
    expect(headers['x-client-id']).toBe(PAGE_BUILDER_CLIENT_ID);    expect(headers['x-user-id']).toBe('user-1');
    expect(headers['iq_tenant_id']).toBe('tenant-1');
    expect(headers['x-tenant-id']).toBe('tenant-1');
  });
});
