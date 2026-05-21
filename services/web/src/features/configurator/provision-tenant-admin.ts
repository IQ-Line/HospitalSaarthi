import { apiClient } from '@/lib/api-client';
import type { CreateUserMutationInput } from '@/features/user-management/api/mutations';
import type { CreateUserBody, UmRole } from '@/features/user-management/types';
import type { TenantWizardAdminSnapshot, TenantWizardRoleSnapshot } from './types';

const UM_BASE = '/api/user-management';

export function buildTenantAdminUserBody(
  admin: TenantWizardAdminSnapshot,
  orgId: string,
  roleId: string,
): CreateUserBody {
  const fullName = `${admin.adminFirstName} ${admin.adminLastName}`.trim();
  const username = admin.adminUsername?.trim();

  return {
    full_name: fullName,
    email: admin.adminEmail,
    password: admin.password,
    phone: admin.adminMobile?.trim() || null,
    username: username || null,
    org_id: orgId,
    capability_ids: [],
    role_template_ids: [roleId],
  };
}

async function createTenantAdminRole(
  tenantId: string,
  role: TenantWizardRoleSnapshot,
): Promise<UmRole> {
  return apiClient<UmRole>(
    `${UM_BASE}/roles`,
    {
      method: 'POST',
      body: JSON.stringify({
        code: role.code,
        display_name: role.displayName,
        description: 'Tenant administrator role created during onboarding',
        is_system: false,
        status: 'active',
      }),
    },
    { tenantIdOverride: tenantId },
  );
}

async function replaceRoleCapabilities(
  tenantId: string,
  roleId: string,
  capabilityIds: string[],
): Promise<void> {
  await apiClient(
    `${UM_BASE}/roles/${encodeURIComponent(roleId)}/capabilities`,
    {
      method: 'PUT',
      body: JSON.stringify({ capability_ids: capabilityIds }),
    },
    { tenantIdOverride: tenantId },
  );
}

export async function provisionTenantAdmin(input: {
  admin: TenantWizardAdminSnapshot;
  role: TenantWizardRoleSnapshot;
  tenantId: string;
  orgId: string;
  createUser: (input: CreateUserMutationInput) => Promise<unknown>;
}): Promise<void> {
  if (input.role.capabilityIds.length === 0) {
    throw new Error('Select at least one permission for the administrator role.');
  }

  const createdRole = await createTenantAdminRole(input.tenantId, input.role);
  await replaceRoleCapabilities(input.tenantId, createdRole.id, input.role.capabilityIds);

  const body = buildTenantAdminUserBody(input.admin, input.orgId, createdRole.id);
  await input.createUser({
    body,
    targetTenantId: input.tenantId,
  });
}
