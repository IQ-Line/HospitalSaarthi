import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTenants } from '@/features/configurator/api/catalog';
import { MOCK_DASHBOARD_FACILITIES } from '../mock/facilities.mock';
import { DashboardDataUnavailableError } from './errors';
import {
  fetchDashboardFacilities,
  resolveDefaultFacilityTenantId,
  shouldUseDashboardMock,
} from './facilities';

vi.mock('@/features/configurator/api/catalog', () => ({
  fetchTenants: vi.fn(),
}));

const fetchTenantsMock = vi.mocked(fetchTenants);

describe('shouldUseDashboardMock', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true when VITE_DASHBOARD_USE_MOCK=true', () => {
    vi.stubEnv('VITE_DASHBOARD_USE_MOCK', 'true');
    vi.stubEnv('DEV', 'false');
    expect(shouldUseDashboardMock()).toBe(true);
  });

  it('is true in dev when mock flag is not explicitly false', () => {
    vi.stubEnv('DEV', 'true');
    vi.unstubAllEnvs();
    vi.stubEnv('DEV', 'true');
    expect(shouldUseDashboardMock()).toBe(true);
  });

  it('is false when VITE_DASHBOARD_USE_MOCK=false even in dev', () => {
    vi.stubEnv('DEV', 'true');
    vi.stubEnv('VITE_DASHBOARD_USE_MOCK', 'false');
    expect(shouldUseDashboardMock()).toBe(false);
  });
});

describe('fetchDashboardFacilities', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns mock facilities in mock mode', async () => {
    vi.stubEnv('VITE_DASHBOARD_USE_MOCK', 'true');
    const facilities = await fetchDashboardFacilities();
    expect(facilities).toEqual(MOCK_DASHBOARD_FACILITIES);
    expect(fetchTenantsMock).not.toHaveBeenCalled();
  });

  it('does not return mock facilities when Configurator fails in live mode', async () => {
    vi.stubEnv('DEV', 'false');
    vi.stubEnv('VITE_DASHBOARD_USE_MOCK', 'false');
    fetchTenantsMock.mockRejectedValue(new Error('Configurator unavailable'));

    await expect(fetchDashboardFacilities()).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(DashboardDataUnavailableError);
      expect((error as Error).message).toContain('Failed to load facilities');
      return true;
    });
  });

  it('maps Configurator tenants in live mode', async () => {
    vi.stubEnv('DEV', 'false');
    vi.stubEnv('VITE_DASHBOARD_USE_MOCK', 'false');
    fetchTenantsMock.mockResolvedValue({
      data: [
        {
          iq_tenant_id: '11111111-1111-4111-8111-111111111111',
          org_id: 'org-1',
          parent_tenant_id: null,
          name: 'Live Hospital',
          slug: 'live-hospital',
          type: 'full_platform',
          provisioning_status: 'active',
          data_isolation_level: 'tenant',
          cerbos_scope_key: 'tenant',
          timezone: 'Asia/Kolkata',
          locale: 'en-IN',
          metadata: null,
          branch_code: 'LIVE001',
          branch_type: 'hub',
          address_line1: null,
          city: null,
          state: null,
          pin_code: null,
          contact_phone: null,
          contact_email: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          created_by: null,
          updated_by: null,
        },
      ],
      total: 1,
    });

    const facilities = await fetchDashboardFacilities();
    expect(facilities).toEqual([
      {
        tenantId: '11111111-1111-4111-8111-111111111111',
        facilityId: 'LIVE001',
        name: 'Live Hospital',
      },
    ]);
  });
});

describe('resolveDefaultFacilityTenantId', () => {
  const facilities = [
    { tenantId: 'tenant-a', facilityId: 'A', name: 'Alpha' },
    { tenantId: 'tenant-b', facilityId: 'B', name: 'Beta' },
  ];

  it('prefers home tenant when present in the list', () => {
    expect(resolveDefaultFacilityTenantId(facilities, 'tenant-b')).toBe('tenant-b');
  });

  it('falls back to first facility when home tenant is absent', () => {
    expect(resolveDefaultFacilityTenantId(facilities, 'tenant-missing')).toBe('tenant-a');
  });

  it('returns undefined for an empty facility list', () => {
    expect(resolveDefaultFacilityTenantId([], 'tenant-a')).toBeUndefined();
  });
});
