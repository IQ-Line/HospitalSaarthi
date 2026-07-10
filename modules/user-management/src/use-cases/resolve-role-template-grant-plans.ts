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

/**
 * Validates a caller-supplied template subset against the capabilities actually
 * on the role, returning the de-duplicated ids to grant. Raises the exact
 * create-user validation issue codes (empty / invalid-uuid / not-on-role).
 */
function resolveTemplateSubset(
  roleTemplateCapabilityIds: string[],
  allowedIds: Set<string>,
): string[] {
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
  return unique;
}

export async function resolveRoleTemplateGrantPlans(
  deps: ResolveRoleTemplateGrantPlansDeps,
  tenantId: string,
  roleIds: string[],
  roleTemplateCapabilityIds: string[] | undefined,
  context?: ModuleEntitlementRequestContext,
): Promise<RoleTemplateGrantPlan[]> {
  // The caller-supplied template subset only applies when assigning a single role.
  const templateSubset =
    roleTemplateCapabilityIds !== undefined && roleIds.length === 1
      ? roleTemplateCapabilityIds
      : undefined;
  const plans: RoleTemplateGrantPlan[] = [];

  for (const roleId of roleIds) {
    const capabilities = await deps.roleCapabilityRepository.listCapabilitiesByRole(tenantId, roleId);

    const capabilityIdsToApply =
      templateSubset !== undefined
        ? resolveTemplateSubset(
            templateSubset,
            new Set(capabilities.map((capability) => capability.id)),
          )
        : capabilities.map((capability) => capability.id);

    await assertRuntimeCapabilitiesEntitledForTenant(
      deps,
      tenantId,
      capabilityIdsToApply,
      context,
    );

    // ADR-0037: role capabilities are read live from `role_capabilities`, never copied onto the
    // user. The subset above is still validated (membership + tenant entitlement) as a guardrail,
    // but only the membership (roleId) is materialized.
    plans.push({ roleId });
  }

  return plans;
}
