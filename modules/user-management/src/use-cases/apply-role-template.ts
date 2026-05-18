import {
  RoleNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import type {
  AppliedRoleTemplate,
  CapabilityRepository,
  MasterDataModuleCatalogPort,
  PrincipalRoleProjectionRepository,
  RoleCapabilityRepository,
  RoleRepository,
  TenantModuleEntitlementPort,
  UserAccessRepository,
  UserRepository,
} from "../ports/index.js";
import { assertRuntimeCapabilitiesEntitledForTenant } from "./assert-runtime-capabilities-entitled-for-tenant.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApplyRoleTemplateDeps = {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
  userAccessRepository: UserAccessRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  capabilityRepository: CapabilityRepository;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
};

export type ApplyRoleTemplateContext = {
  tenantId: string;
  actorId: string | null;
  correlationId: string;
};

export async function applyRoleTemplate(
  deps: ApplyRoleTemplateDeps,
  ctx: ApplyRoleTemplateContext,
  input: {
    user_id: string;
    role_id: string;
    /** When set, only these capabilities are granted (each must belong to the role). */
    role_template_capability_ids?: string[];
  },
): Promise<AppliedRoleTemplate> {
  if (!UUID_RE.test(input.user_id) || !UUID_RE.test(input.role_id)) {
    throw new ValidationError("apply_role_template_ids_invalid");
  }

  const user = await deps.userRepository.getUserById(ctx.tenantId, input.user_id);
  if (user === null) {
    throw new UserNotFoundError(input.user_id);
  }

  const role = await deps.roleRepository.getRoleById(ctx.tenantId, input.role_id);
  if (role === null) {
    throw new RoleNotFoundError(input.role_id);
  }

  const capabilities = await deps.roleCapabilityRepository.listCapabilitiesByRole(
    ctx.tenantId,
    input.role_id,
  );
  const allowedIds = new Set(capabilities.map((capability) => capability.id));

  let capabilityIdsToApply: string[];
  if (input.role_template_capability_ids !== undefined) {
    const unique = [...new Set(input.role_template_capability_ids.map((id) => id.trim()))];
    if (unique.length === 0) {
      throw new ValidationError("apply_role_template_capability_ids_empty");
    }
    for (const capabilityId of unique) {
      if (!UUID_RE.test(capabilityId)) {
        throw new ValidationError("apply_role_template_capability_ids_invalid");
      }
      if (!allowedIds.has(capabilityId)) {
        throw new ValidationError("apply_role_template_capability_not_on_role");
      }
    }
    capabilityIdsToApply = unique;
  } else {
    capabilityIdsToApply = capabilities.map((capability) => capability.id);
  }

  await assertRuntimeCapabilitiesEntitledForTenant(
    {
      capabilityRepository: deps.capabilityRepository,
      tenantModuleEntitlementPort: deps.tenantModuleEntitlementPort,
      masterDataModuleCatalogPort: deps.masterDataModuleCatalogPort,
    },
    ctx.tenantId,
    capabilityIdsToApply,
    { cachePolicy: "bypass-cache" },
  );

  const applied = await deps.userAccessRepository.applyRoleTemplate(ctx.tenantId, {
    userId: input.user_id,
    roleId: input.role_id,
    capabilityIds: capabilityIdsToApply,
    actorId: ctx.actorId,
  });
  deps.principalRoleProjectionRepository.clearCache();
  return applied;
}
