import { ValidationError } from "../domain/errors.js";
import { assertRuntimeCapabilitiesEntitledForTenant } from "./assert-runtime-capabilities-entitled-for-tenant.js";
import type { ListAssignableRuntimeCapabilitiesDeps } from "./list-assignable-runtime-capabilities.js";
import type { RoleCapabilityRepository } from "../ports/index.js";
import type { RoleTemplateGrantPlan } from "../ports/user-provisioning-repository.js";
import type { ModuleEntitlementRequestContext } from "../ports/module-integration-ports.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResolveRoleTemplateGrantPlansDeps = ListAssignableRuntimeCapabilitiesDeps & {
  roleCapabilityRepository: RoleCapabilityRepository;
};

export async function resolveRoleTemplateGrantPlans(
  deps: ResolveRoleTemplateGrantPlansDeps,
  tenantId: string,
  roleIds: string[],
  roleTemplateCapabilityIds: string[] | undefined,
  context?: ModuleEntitlementRequestContext,
): Promise<RoleTemplateGrantPlan[]> {
  const plans: RoleTemplateGrantPlan[] = [];

  for (const roleId of roleIds) {
    const capabilities = await deps.roleCapabilityRepository.listCapabilitiesByRole(tenantId, roleId);
    const allowedIds = new Set(capabilities.map((capability) => capability.id));

    let capabilityIdsToApply: string[];
    if (roleTemplateCapabilityIds !== undefined && roleIds.length === 1) {
      const unique = [...new Set(roleTemplateCapabilityIds.map((id) => id.trim()))];
      if (unique.length === 0) {
        throw new ValidationError("create_user_role_template_capability_ids_empty");
      }
      for (const capabilityId of unique) {
        if (!UUID_RE.test(capabilityId)) {
          throw new ValidationError("create_user_role_template_capability_ids_invalid");
        }
        if (!allowedIds.has(capabilityId)) {
          throw new ValidationError("create_user_role_template_capability_not_on_role");
        }
      }
      capabilityIdsToApply = unique;
    } else {
      capabilityIdsToApply = capabilities.map((capability) => capability.id);
    }

    await assertRuntimeCapabilitiesEntitledForTenant(
      deps,
      tenantId,
      capabilityIdsToApply,
      context,
    );

    plans.push({ roleId, capabilityIds: capabilityIdsToApply });
  }

  return plans;
}
