import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTenants } from '@/features/configurator/api/catalog';
import { DashboardDataUnavailableError } from './errors';
import { fetchDashboardFacilities, resolveDefaultFacilityTenantId } from './facilities';

vi.mock('@/features/configurator/api/catalog', () => ({
  fetchTenants: vi.fn(),
}));

const fetchTenantsMock = vi.mocked(fetchTenants);

describe('fetchDashboardFacilities', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps and dedupes Configurator tenants', async () => {
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

  it('throws when Configurator fails', async () => {
    fetchTenantsMock.mockRejectedValue(new Error('Configurator unavailable'));
    await expect(fetchDashboardFacilities()).rejects.toBeInstanceOf(DashboardDataUnavailableError);
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
});
