import {
  RoleNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import type {
  AppliedRoleTemplate,
  PrincipalRoleProjectionRepository,
  RoleCapabilityRepository,
  RoleRepository,
  UserAccessRepository,
  UserRepository,
} from "../ports/index.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApplyRoleTemplateDeps = {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
  userAccessRepository: UserAccessRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
};

export type ApplyRoleTemplateContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

export async function applyRoleTemplate(
  deps: ApplyRoleTemplateDeps,
  ctx: ApplyRoleTemplateContext,
  input: {
    user_id: string;
    role_id: string;
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

  const applied = await deps.userAccessRepository.applyRoleTemplate(ctx.tenantId, {
    userId: input.user_id,
    roleId: input.role_id,
    capabilityIds: capabilities.map((capability) => capability.id),
    actorId: ctx.actorId,
  });
  deps.principalRoleProjectionRepository.clearCache();
  return applied;
}
