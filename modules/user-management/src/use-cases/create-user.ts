import type { EventBus } from "@hims/ts-sdk-events";
import {
  CapabilityNotFoundError,
  UnexpectedPersistenceError,
  RoleNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import { USER_MANAGEMENT_EVENT_USER_CREATED } from "../events/constants.js";
import { ensureUserEventPayload } from "../events/ensure-user-event-payload.js";
import { publishUserManagementEvent } from "../events/publish-user-management-event.js";
import { applyRoleTemplate } from "./apply-role-template.js";
import type {
  AuthAccountProvisioner,
  CapabilityRepository,
  CreateUserInput,
  PrincipalRoleProjectionRepository,
  RoleCapabilityRepository,
  RoleRepository,
  UserAccessRepository,
  User,
  UserRepository,
} from "../ports/index.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateUserDeps = {
  userRepository: UserRepository;
  capabilityRepository: CapabilityRepository;
  roleRepository: RoleRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
  userAccessRepository: UserAccessRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  authAccountProvisioner: AuthAccountProvisioner;
  eventBus: EventBus;
};

export type CreateUserContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

/**
 * Creates a tenant-scoped platform user and publishes `user-management.user.created`.
 */
export async function createUser(
  deps: CreateUserDeps,
  ctx: CreateUserContext,
  input: CreateUserInput,
): Promise<User> {
  if (typeof input.full_name !== "string") {
    throw new ValidationError("full_name_invalid_type");
  }
  if (input.full_name.trim() === "") {
    throw new ValidationError("full_name_empty");
  }

  if (typeof input.email !== "string") {
    throw new ValidationError("email_invalid_type");
  }
  const email = input.email.trim();
  if (email === "") {
    throw new ValidationError("email_required");
  }
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError("email_invalid_type");
  }

  if (typeof input.password !== "string") {
    throw new ValidationError("password_invalid_type");
  }
  if (input.password.trim() === "") {
    throw new ValidationError("password_required");
  }
  if (input.password.length < 8) {
    throw new ValidationError("password_too_short");
  }

  if (
    input.capability_ids !== undefined &&
    (!Array.isArray(input.capability_ids) ||
      input.capability_ids.some(
        (capabilityId) => typeof capabilityId !== "string" || !UUID_RE.test(capabilityId),
      ))
  ) {
    throw new ValidationError("create_user_capability_ids_invalid");
  }

  if (
    input.role_template_ids !== undefined &&
    (!Array.isArray(input.role_template_ids) ||
      input.role_template_ids.some((roleId) => typeof roleId !== "string" || !UUID_RE.test(roleId)))
  ) {
    throw new ValidationError("create_user_role_template_ids_invalid");
  }

  if (
    input.role_template_capability_ids !== undefined &&
    (!Array.isArray(input.role_template_capability_ids) ||
      input.role_template_capability_ids.some(
        (capabilityId) => typeof capabilityId !== "string" || !UUID_RE.test(capabilityId),
      ))
  ) {
    throw new ValidationError("create_user_role_template_capability_ids_invalid");
  }

  const roleIds = [...new Set((input.role_template_ids ?? []).map((roleId) => roleId.trim()))];
  const roleTemplateCapabilityIds =
    input.role_template_capability_ids !== undefined
      ? [...new Set(input.role_template_capability_ids.map((id) => id.trim()))]
      : undefined;

  if (roleTemplateCapabilityIds !== undefined && roleIds.length !== 1) {
    throw new ValidationError("create_user_role_template_capability_ids_requires_single_role");
  }

  const capabilityIds = [...new Set((input.capability_ids ?? []).map((capabilityId) => capabilityId.trim()))];
  if (capabilityIds.length > 0) {
    const capabilities = await deps.capabilityRepository.listCapabilitiesByIds(capabilityIds);
    if (capabilities.length !== capabilityIds.length) {
      const capabilityIdsFound = new Set(capabilities.map((capability) => capability.id));
      const missingCapabilityId = capabilityIds.find(
        (capabilityId) => !capabilityIdsFound.has(capabilityId),
      );
      throw new CapabilityNotFoundError(missingCapabilityId);
    }
  }

  if (roleIds.length > 0) {
    const roles = await deps.roleRepository.listRolesByIds(ctx.tenantId, roleIds);
    if (roles.length !== roleIds.length) {
      const roleIdsFound = new Set(roles.map((role) => role.id));
      const missingRoleId = roleIds.find((roleId) => !roleIdsFound.has(roleId));
      throw new RoleNotFoundError(missingRoleId);
    }
  }

  const user = await deps.userRepository.createUser(ctx.tenantId, {
    ...input,
    email,
  });

  const grantActorId =
    (await deps.userRepository.getUserById(ctx.tenantId, ctx.actorId)) !== null
      ? ctx.actorId
      : null;

  const authAccount = await deps.authAccountProvisioner.createPasswordAccount({
    platformUserId: user.id,
    tenantId: ctx.tenantId,
    fullName: user.full_name,
    email,
    password: input.password,
  });

  const linkedUser = await deps.userRepository.updateUser(ctx.tenantId, user.id, {
    auth_user_id: authAccount.authUserId,
  });
  if (linkedUser === null) {
    throw new UnexpectedPersistenceError();
  }

  if (capabilityIds.length > 0) {
    await deps.userAccessRepository.replaceManualCapabilityGrants(ctx.tenantId, {
      userId: linkedUser.id,
      capabilityIds,
      actorId: grantActorId,
    });
  }

  for (const roleId of roleIds) {
    await applyRoleTemplate(
      {
        userRepository: deps.userRepository,
        roleRepository: deps.roleRepository,
        roleCapabilityRepository: deps.roleCapabilityRepository,
        userAccessRepository: deps.userAccessRepository,
        principalRoleProjectionRepository: deps.principalRoleProjectionRepository,
      },
      { ...ctx, actorId: grantActorId },
      {
        user_id: linkedUser.id,
        role_id: roleId,
        ...(roleTemplateCapabilityIds !== undefined && roleIds.length === 1
          ? { role_template_capability_ids: roleTemplateCapabilityIds }
          : {}),
      },
    );
  }

  deps.principalRoleProjectionRepository.clearCache();

  await publishUserManagementEvent(
    { eventBus: deps.eventBus },
    USER_MANAGEMENT_EVENT_USER_CREATED,
    ctx,
    ensureUserEventPayload(linkedUser),
  );
  return linkedUser;
}
