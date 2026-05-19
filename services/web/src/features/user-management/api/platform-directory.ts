import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { fetchOrganizations, fetchTenants } from '@/features/configurator/api/catalog';
import type { ConfiguratorTenant, Organization } from '@/features/configurator/types';
import type { UmRole, UmUser } from '../types';
import { userManagementKeys } from './keys';

const UM_BASE = '/api/user-management';

export type PlatformDirectoryTenantUsers = {
  tenant: ConfiguratorTenant;
  organizationName: string;
  users: UmUser[];
  error?: string;
};

export type PlatformDirectoryTenantRoles = {
  tenant: ConfiguratorTenant;
  organizationName: string;
  roles: UmRole[];
  error?: string;
};

export type PlatformDirectorySnapshot = {
  organizations: Organization[];
  tenants: ConfiguratorTenant[];
  usersByTenant: PlatformDirectoryTenantUsers[];
  rolesByTenant: PlatformDirectoryTenantRoles[];
};

async function fetchUsersForTenant(tenantId: string): Promise<UmUser[]> {
  return apiClient<UmUser[]>(
    `${UM_BASE}/users`,
    { method: 'GET' },
    { tenantIdOverride: tenantId },
  );
}

async function fetchRolesForTenant(tenantId: string): Promise<UmRole[]> {
  return apiClient<UmRole[]>(
    `${UM_BASE}/roles`,
    { method: 'GET' },
    { tenantIdOverride: tenantId },
  );
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

/** Tenants that should appear in the platform user directory (excludes decommissioned). */
export function directoryEligibleTenants(tenants: ConfiguratorTenant[]): ConfiguratorTenant[] {
  return tenants.filter((t) => t.provisioning_status !== 'decommissioned');
}

/**
 * Loads every non-decommissioned Configurator tenant and fetches UM users + roles per tenant
 * (platform super-admin cross-tenant `iq_tenant_id` header).
 */
export async function fetchPlatformDirectory(): Promise<PlatformDirectorySnapshot> {
  const [orgRes, tenantRes] = await Promise.all([
    fetchOrganizations({ status: 'active' }),
    fetchTenants(),
  ]);

  const organizations = orgRes.data;
  const tenants = directoryEligibleTenants(tenantRes.data);
  const orgNameById = new Map(organizations.map((o) => [o.id, o.name]));

  const usersByTenant: PlatformDirectoryTenantUsers[] = [];
  const rolesByTenant: PlatformDirectoryTenantRoles[] = [];

  await Promise.all(
    tenants.map(async (tenant) => {
      const organizationName = orgNameById.get(tenant.org_id) ?? tenant.org_id;

      const [usersResult, rolesResult] = await Promise.allSettled([
        fetchUsersForTenant(tenant.iq_tenant_id),
        fetchRolesForTenant(tenant.iq_tenant_id),
      ]);

      usersByTenant.push({
        tenant,
        organizationName,
        users: usersResult.status === 'fulfilled' ? usersResult.value : [],
        error: usersResult.status === 'rejected' ? errorMessage(usersResult.reason) : undefined,
      });

      rolesByTenant.push({
        tenant,
        organizationName,
        roles: rolesResult.status === 'fulfilled' ? rolesResult.value : [],
        error: rolesResult.status === 'rejected' ? errorMessage(rolesResult.reason) : undefined,
      });
    }),
  );

  usersByTenant.sort((a, b) => a.tenant.name.localeCompare(b.tenant.name));
  rolesByTenant.sort((a, b) => a.tenant.name.localeCompare(b.tenant.name));

  return { organizations, tenants, usersByTenant, rolesByTenant };
}

export function platformDirectoryQueryOptions() {
  return queryOptions({
    queryKey: userManagementKeys.platformDirectory(),
    queryFn: fetchPlatformDirectory,
    staleTime: 30_000,
  });
}

export type PlatformDirectoryUserRow = UmUser & {
  iq_tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_provisioning_status: string;
  organization_name: string;
};

export type PlatformDirectoryRoleRow = UmRole & {
  iq_tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  organization_name: string;
};

export function flattenPlatformDirectoryUsers(
  snapshot: PlatformDirectorySnapshot,
): PlatformDirectoryUserRow[] {
  const rows: PlatformDirectoryUserRow[] = [];
  for (const block of snapshot.usersByTenant) {
    for (const user of block.users) {
      rows.push({
        ...user,
        iq_tenant_id: block.tenant.iq_tenant_id,
        tenant_name: block.tenant.name,
        tenant_slug: block.tenant.slug,
        tenant_provisioning_status: block.tenant.provisioning_status,
        organization_name: block.organizationName,
      });
    }
  }
  return rows.sort((a, b) => {
    const byTenant = a.tenant_name.localeCompare(b.tenant_name);
    if (byTenant !== 0) return byTenant;
    return a.full_name.localeCompare(b.full_name);
  });
}

export function flattenPlatformDirectoryRoles(
  snapshot: PlatformDirectorySnapshot,
): PlatformDirectoryRoleRow[] {
  const rows: PlatformDirectoryRoleRow[] = [];
  for (const block of snapshot.rolesByTenant) {
    for (const role of block.roles) {
      rows.push({
        ...role,
        iq_tenant_id: block.tenant.iq_tenant_id,
        tenant_name: block.tenant.name,
        tenant_slug: block.tenant.slug,
        organization_name: block.organizationName,
      });
    }
  }
  return rows.sort((a, b) => {
    const byTenant = a.tenant_name.localeCompare(b.tenant_name);
    if (byTenant !== 0) return byTenant;
    return a.code.localeCompare(b.code);
  });
}

export function platformDirectoryTenantErrors(snapshot: PlatformDirectorySnapshot): string[] {
  const messages: string[] = [];
  for (const block of snapshot.usersByTenant) {
    if (block.error) {
      messages.push(`${block.tenant.name} (users): ${block.error}`);
    }
  }
  for (const block of snapshot.rolesByTenant) {
    if (block.error) {
      messages.push(`${block.tenant.name} (roles): ${block.error}`);
    }
  }
  return messages;
}
