import { apiClient } from '@/lib/api-client';
import { parseAccessJwtClaims } from '@/lib/jwt-claims';
import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import { useTenantStore } from '@/stores/tenant.store';

type ConfiguratorTenantRow = {
  iq_tenant_id: string;
  name: string;
  slug: string;
  provisioning_status: string;
};

type ConfiguratorTenantListResponse = {
  data: ConfiguratorTenantRow[];
  total: number;
};

const DEFAULT_BRANCH = { id: 'branch-001', name: 'Main Campus' } as const;

async function fetchTenantName(tenantId: string): Promise<string> {
  try {
    const row = await apiClient<ConfiguratorTenantRow>(
      `/api/configurator/v1/tenants/${encodeURIComponent(tenantId)}`,
      { method: 'GET' },
      { tenantIdOverride: tenantId },
    );
    return row.name?.trim() || row.slug || tenantId;
  } catch {
    return tenantId;
  }
}

export type ApplyTenantSessionInput = {
  accessToken: string;
  /** better-auth user field when present */
  authUserIqTenantId?: string | null;
  /** Restore persisted active tenant when still valid for this principal */
  preferredActiveTenantId?: string | null;
};

/**
 * Hydrates tenant store from JWT / auth user after login or session restore.
 */
export async function applyTenantSessionFromAuth(input: ApplyTenantSessionInput): Promise<void> {
  const claims = parseAccessJwtClaims(input.accessToken);
  const homeTenantId =
    (typeof input.authUserIqTenantId === 'string' && input.authUserIqTenantId.trim()) ||
    (typeof claims.iq_tenant_id === 'string' && claims.iq_tenant_id.trim()) ||
    null;

  if (homeTenantId == null) {
    useTenantStore.getState().clearTenant();
    return;
  }

  const isSuperAdmin = isPlatformSuperAdminFromAccessToken(input.accessToken);
  const preferred = input.preferredActiveTenantId?.trim() || null;
  const activeTenantId =
    isSuperAdmin && preferred && preferred.length > 0 ? preferred : homeTenantId;

  const tenantName = await fetchTenantName(activeTenantId);

  useTenantStore.getState().setTenantContext({
    homeTenantId,
    tenantId: activeTenantId,
    tenantName,
    branches: [DEFAULT_BRANCH],
    activeBranch: DEFAULT_BRANCH.id,
  });
}
