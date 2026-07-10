import { apiClient, apiClientWithIqTenant } from '@/lib/api-client';
import type { Capability, UmRole, UmUser } from '@/features/user-management/types';

const UM_BASE = '/api/user-management';

export const TENANT_ADMIN_ROLE_CODE = 'tenant-admin';
export const TENANT_ADMIN_ROLE_TYPE = 'tenant-admin';
export const TENANT_ADMIN_ROLE_DISPLAY_NAME = 'Tenant Administrator';

export type ProvisionTenantAdminInput = {
  iqTenantId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string | null;
  password: string;
  phone?: string | null;
};

/**
 * Provisions a tenant-admin role and user in user-management for a tenant that already
 * exists in configurator (e.g. after branch creation). Mirrors post-commit steps in
 * {@link provisionTenant} on the backend.
 */
export async function provisionTenantAdministrator(
  input: ProvisionTenantAdminInput,
): Promise<{ role: UmRole; user: UmUser }> {
  const tenantCtx = { tenantIdOverride: input.iqTenantId.trim() };
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const username = input.username.trim().toLowerCase();
  const email = input.email?.trim() ? input.email.trim().toLowerCase() : undefined;

  const capabilities = await apiClientWithIqTenant<Capability[]>(
    input.iqTenantId,
    `${UM_BASE}/capabilities/assignable`,
    { method: 'GET' },
  );
  const capabilityIds = capabilities.map((c) => c.id);

  const role = await apiClient<UmRole>(
    `${UM_BASE}/roles`,
    {
      method: 'POST',
      body: JSON.stringify({
        code: TENANT_ADMIN_ROLE_CODE,
        role_type: TENANT_ADMIN_ROLE_TYPE,
        display_name: TENANT_ADMIN_ROLE_DISPLAY_NAME,
        is_system: true,
      }),
    },
    tenantCtx,
  );

  if (capabilityIds.length > 0) {
    await apiClient(
      `${UM_BASE}/roles/${encodeURIComponent(role.id)}/capabilities`,
      {
        method: 'PUT',
        body: JSON.stringify({ capability_ids: capabilityIds }),
      },
      tenantCtx,
    );
  }

  const user = await apiClient<UmUser>(
    `${UM_BASE}/users`,
    {
      method: 'POST',
      body: JSON.stringify({
        full_name: fullName,
        username,
        email,
        password: input.password,
        phone: input.phone?.trim() || undefined,
        org_id: input.organizationId,
        capability_ids: [],
        role_template_ids: [role.id],
        role_template_capability_ids: capabilityIds,
      }),
    },
    tenantCtx,
  );

  return { role, user };
}
