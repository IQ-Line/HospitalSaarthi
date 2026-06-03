import { fetchTenants } from '@/features/configurator/api/catalog';
import type { ConfiguratorTenant } from '@/features/configurator/types';
import { DashboardDataUnavailableError } from './errors';
import type { DashboardFacility } from '../types';

function tenantToFacility(tenant: ConfiguratorTenant): DashboardFacility {
  const facilityId =
    tenant.branch_code?.trim() ||
    tenant.slug.toUpperCase().slice(0, 12) ||
    tenant.iq_tenant_id.slice(0, 8);
  return {
    tenantId: tenant.iq_tenant_id,
    facilityId,
    name: tenant.name,
  };
}

/** Active Configurator tenants for the super-admin facility switcher. */
export async function fetchDashboardFacilities(): Promise<DashboardFacility[]> {
  try {
    const response = await fetchTenants({ provisioning_status: 'active' });
    const seen = new Set<string>();
    const facilities: DashboardFacility[] = [];
    for (const row of response.data.map(tenantToFacility)) {
      if (seen.has(row.tenantId)) continue;
      seen.add(row.tenantId);
      facilities.push(row);
    }
    facilities.sort((a, b) => a.name.localeCompare(b.name));
    if (facilities.length === 0) {
      throw new DashboardDataUnavailableError(
        'No active tenant facilities returned from Configurator.',
      );
    }
    return facilities;
  } catch (error) {
    if (error instanceof DashboardDataUnavailableError) throw error;
    throw new DashboardDataUnavailableError('Failed to load facilities from Configurator.', {
      cause: error,
    });
  }
}

export function resolveDefaultFacilityTenantId(
  facilities: DashboardFacility[],
  homeTenantId: string | null | undefined,
): string | undefined {
  if (facilities.length === 0) return undefined;
  if (homeTenantId && facilities.some((f) => f.tenantId === homeTenantId)) {
    return homeTenantId;
  }
  return facilities[0]?.tenantId;
}
