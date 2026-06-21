import { randomUUID } from "node:crypto";
import type { EventBus } from "@hims/ts-sdk-events";
import {
  CapabilityNotFoundError,
  RoleNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import {
  RUNTIME_AUTH_LIMITS,
  assertWithinLimit,
  dedupeTrimmedIds,
} from "../domain/runtime-authorization-limits.js";
import { assertValidPassword } from "../domain/validate-password.js";
import { USER_MANAGEMENT_EVENT_USER_CREATED } from "../events/constants.js";
import { ensureUserEventPayload } from "../events/ensure-user-event-payload.js";
import { publishUserManagementEvent } from "../events/publish-user-management-event.js";
import { assertRuntimeCapabilitiesEntitledForTenant } from "./assert-runtime-capabilities-entitled-for-tenant.js";
import { resolveRoleTemplateGrantPlans } from "./resolve-role-template-grant-plans.js";
import type {
  AuthAccountProvisioner,
  CapabilityRepository,
  CreateUserInput,
  MasterDataModuleCatalogPort,
  PrincipalRoleProjectionRepository,
  RoleCapabilityRepository,
  RoleRepository,
  TenantModuleEntitlementPort,
  User,
  UserRepository,
} from "../ports/index.js";
import type { ModuleEntitlementRequestContext } from "../ports/module-integration-ports.js";
import type { UserProvisioningRepository } from "../ports/user-provisioning-repository.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Username-primary login (authn spec §2). Charset matches better-auth's default username validator
// (/^[a-zA-Z0-9_.]+$/) intersected with our lowercase-in-place rule — NO hyphen (better-auth rejects it).
const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateUserDeps = {
  userRepository: UserRepository;
  userProvisioningRepository: UserProvisioningRepository;
  capabilityRepository: CapabilityRepository;
  roleRepository: RoleRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  authAccountProvisioner: AuthAccountProvisioner;
  eventBus: EventBus;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
};

export type CreateUserContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

/**
 * Creates a tenant-scoped platform user and publishes `user-management.user.created`.
 * User row and initial grants persist in one DB transaction; events publish only after commit.
 */
export async function createUser(
  deps: CreateUserDeps,
  ctx: CreateUserContext,
  input: CreateUserInput,
  entitlementContext?: ModuleEntitlementRequestContext,
): Promise<User> {
  if (typeof input.full_name !== "string") {
    throw new ValidationError("full_name_invalid_type");
  }
  if (input.full_name.trim() === "") {
    throw new ValidationError("full_name_empty");
  }

  // Username-primary identity: username is the login credential and is required; email is optional
  // business-contact data (authn spec §2). The synthetic better-auth anchor is derived from username
  // inside the provisioner, never here.
  if (typeof input.username !== "string" || input.username.trim() === "") {
    throw new ValidationError("username_required");
  }
  const username = input.username.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new ValidationError("username_invalid");
  }

  let email: string | null = null;
  if (input.email !== undefined && input.email !== null && String(input.email).trim() !== "") {
    if (typeof input.email !== "string") {
      throw new ValidationError("email_invalid_type");
    }
    const trimmed = input.email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      throw new ValidationError("email_invalid_type");
    }
    email = trimmed;
  }
  // Recovery tier (authn spec §3.2): a real email enables self-serve reset later ('standard');
  // without one the only recovery path is an admin-driven reset ('admin_only').
  const recoveryTier = email !== null ? "standard" : "admin_only";

  assertValidPassword(input.password);

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

  const roleIds = dedupeTrimmedIds(input.role_template_ids ?? []);
  const roleTemplateCapabilityIds =
    input.role_template_capability_ids !== undefined
      ? dedupeTrimmedIds(input.role_template_capability_ids)
      : undefined;

  assertWithinLimit(
    roleIds.length,
    RUNTIME_AUTH_LIMITS.maxRoleTemplateIdsPerCreateUser,
    "create_user_role_template_ids_limit_exceeded",
  );

  if (roleTemplateCapabilityIds !== undefined && roleIds.length !== 1) {
    throw new ValidationError("create_user_role_template_capability_ids_requires_single_role");
  }

  const capabilityIds = dedupeTrimmedIds(input.capability_ids ?? []);
  assertWithinLimit(
    capabilityIds.length,
    RUNTIME_AUTH_LIMITS.maxCapabilityIdsPerRequest,
    "create_user_capability_ids_limit_exceeded",
  );

  const entitlementDeps = {
    capabilityRepository: deps.capabilityRepository,
    tenantModuleEntitlementPort: deps.tenantModuleEntitlementPort,
    masterDataModuleCatalogPort: deps.masterDataModuleCatalogPort,
  };

  if (capabilityIds.length > 0) {
    const capabilities = await deps.capabilityRepository.listCapabilitiesByIds(capabilityIds);
    if (capabilities.length !== capabilityIds.length) {
      const capabilityIdsFound = new Set(capabilities.map((capability) => capability.id));
      const missingCapabilityId = capabilityIds.find(
        (capabilityId) => !capabilityIdsFound.has(capabilityId),
      );
      throw new CapabilityNotFoundError(missingCapabilityId);
    }
    await assertRuntimeCapabilitiesEntitledForTenant(
      entitlementDeps,
      ctx.tenantId,
      capabilityIds,
      { cachePolicy: "bypass-cache", authorization: entitlementContext?.authorization },
    );
  }

  if (roleIds.length > 0) {
    const roles = await deps.roleRepository.listRolesByIds(ctx.tenantId, roleIds);
    if (roles.length !== roleIds.length) {
      const roleIdsFound = new Set(roles.map((role) => role.id));
      const missingRoleId = roleIds.find((roleId) => !roleIdsFound.has(roleId));
      throw new RoleNotFoundError(missingRoleId);
    }
  }

  const roleTemplateGrants =
    roleIds.length > 0
      ? await resolveRoleTemplateGrantPlans(
          { ...entitlementDeps, roleCapabilityRepository: deps.roleCapabilityRepository },
          ctx.tenantId,
          roleIds,
          roleTemplateCapabilityIds,
          { cachePolicy: "bypass-cache", authorization: entitlementContext?.authorization },
        )
      : [];

  const grantActorId =
    (await deps.userRepository.getUserById(ctx.tenantId, ctx.actorId)) !== null
      ? ctx.actorId
      : null;

  const userId = randomUUID();

  const authAccount = await deps.authAccountProvisioner.createPasswordAccount({
    platformUserId: userId,
    tenantId: ctx.tenantId,
    fullName: input.full_name,
    username,
    password: input.password,
  });

  const linkedUser = await deps.userProvisioningRepository.provisionUserWithAccess(ctx.tenantId, {
    userId,
    user: { ...input, username, email },
    recoveryTier,
    authUserId: authAccount.authUserId,
    manualCapabilityIds: capabilityIds,
    roleTemplateGrants,
    actorId: grantActorId,
  });

  deps.principalRoleProjectionRepository.clearCache();

  await publishUserManagementEvent(
    { eventBus: deps.eventBus },
    USER_MANAGEMENT_EVENT_USER_CREATED,
    ctx,
    ensureUserEventPayload(linkedUser),
  );
  return linkedUser;
}
