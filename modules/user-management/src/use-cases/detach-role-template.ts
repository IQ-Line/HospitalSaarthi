import {
  RoleNotFoundError,
  UserNotFoundError,
  UserRoleTemplateNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import type {
  AppliedRoleTemplate,
  PrincipalRoleProjectionRepository,
  RoleRepository,
  UserAccessRepository,
  UserRepository,
} from "../ports/index.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DetachRoleTemplateDeps = {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
  userAccessRepository: UserAccessRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
};

export type DetachRoleTemplateContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

export async function detachRoleTemplate(
  deps: DetachRoleTemplateDeps,
  ctx: DetachRoleTemplateContext,
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

  const removed = await deps.userAccessRepository.detachRoleTemplate(ctx.tenantId, {
    userId: input.user_id,
    roleId: input.role_id,
  });
  if (removed === null) {
    throw new UserRoleTemplateNotFoundError();
  }

  deps.principalRoleProjectionRepository.clearCache();
  return removed;
}
