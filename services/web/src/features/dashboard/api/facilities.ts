import { fetchTenants } from '@/features/configurator/api/catalog';
import type { ConfiguratorTenant } from '@/features/configurator/types';
import { MOCK_DASHBOARD_FACILITIES } from '../mock/facilities.mock';
import type { DashboardFacility } from '../types';

/** Dev UI without facility API — set `VITE_DASHBOARD_USE_MOCK=false` to load Configurator tenants. */
export function shouldUseDashboardMock(): boolean {
  return (
    import.meta.env.VITE_DASHBOARD_USE_MOCK === 'true' ||
    (import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_USE_MOCK !== 'false')
  );
}

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

function dedupeFacilitiesByTenant(facilities: DashboardFacility[]): DashboardFacility[] {
  const seen = new Set<string>();
  const unique: DashboardFacility[] = [];
  for (const facility of facilities) {
    if (seen.has(facility.tenantId)) continue;
    seen.add(facility.tenantId);
    unique.push(facility);
  }
  return unique.sort((a, b) => a.name.localeCompare(b.name));
}

/** Loads facilities for the dashboard switcher (Configurator tenants or mock). */
export async function fetchDashboardFacilities(): Promise<DashboardFacility[]> {
  if (shouldUseDashboardMock()) {
    return [...MOCK_DASHBOARD_FACILITIES];
  }

  try {
    const response = await fetchTenants({ provisioning_status: 'active' });
    const mapped = response.data.map(tenantToFacility);
    const deduped = dedupeFacilitiesByTenant(mapped);
    if (deduped.length > 0) {
      return deduped;
    }
  } catch {
    // Fall through to mock when Configurator is unavailable in dev.
  }

  return [...MOCK_DASHBOARD_FACILITIES];
}

/** Prefer home tenant when it appears in the list; otherwise first facility (sorted). */
export function resolveDefaultFacilityTenantId(
  facilities: DashboardFacility[],
  homeTenantId: string | null | undefined,
): string | undefined {
  if (facilities.length === 0) {
    return undefined;
  }
  if (homeTenantId && facilities.some((f) => f.tenantId === homeTenantId)) {
    return homeTenantId;
  }
  return facilities[0]?.tenantId;
}
