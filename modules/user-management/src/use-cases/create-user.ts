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

// eslint-disable-next-line sonarjs/slow-regex -- `@` is excluded from every class, so the first split is unambiguous; the remaining `[^\s@]+\.[^\s@]+$` has no nested quantifier (linear backtracking only); not ReDoS
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

/** True when every element of `value` is a UUID string. Used to validate optional id arrays. */
function isUuidArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && UUID_RE.test(entry))
  );
}

/**
 * Validates the optional UUID-array fields on the input. Each field, when present, must be an array
 * of UUID strings; the three fields share identical shape rules but carry distinct error issues.
 */
function assertUuidArrayFields(input: CreateUserInput): void {
  if (input.capability_ids !== undefined && !isUuidArray(input.capability_ids)) {
    throw new ValidationError("create_user_capability_ids_invalid");
  }
  if (input.role_template_ids !== undefined && !isUuidArray(input.role_template_ids)) {
    throw new ValidationError("create_user_role_template_ids_invalid");
  }
  if (
    input.role_template_capability_ids !== undefined &&
    !isUuidArray(input.role_template_capability_ids)
  ) {
    throw new ValidationError("create_user_role_template_capability_ids_invalid");
  }
}

/** Validated, normalized identity fields ready for provisioning. */
type NormalizedIdentity = {
  username: string;
  email: string | null;
  recoveryTier: "standard" | "admin_only";
};

/**
 * Validates and normalizes the user's identity fields (full_name, username, email) and derives the
 * recovery tier. Throws ValidationError on the first invalid field.
 */
function normalizeIdentity(input: CreateUserInput): NormalizedIdentity {
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

  const email = normalizeEmail(input.email);
  // Recovery tier (authn spec §3.2): a real email enables self-serve reset later ('standard');
  // without one the only recovery path is an admin-driven reset ('admin_only').
  const recoveryTier = email !== null ? "standard" : "admin_only";

  return { username, email, recoveryTier };
}

/** Returns a trimmed valid email, or null when no email was supplied. Throws on a malformed email. */
function normalizeEmail(rawEmail: CreateUserInput["email"]): string | null {
  if (rawEmail === undefined || rawEmail === null || String(rawEmail).trim() === "") {
    return null;
  }
  if (typeof rawEmail !== "string") {
    throw new ValidationError("email_invalid_type");
  }
  const trimmed = rawEmail.trim();
  if (!EMAIL_RE.test(trimmed)) {
    throw new ValidationError("email_invalid_type");
  }
  return trimmed;
}

type EntitlementDeps = {
  capabilityRepository: CapabilityRepository;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
};

/** Loads capabilities by id and throws CapabilityNotFoundError for the first id that is missing. */
async function assertCapabilitiesExist(
  capabilityRepository: CapabilityRepository,
  capabilityIds: string[],
): Promise<void> {
  const capabilities = await capabilityRepository.listCapabilitiesByIds(capabilityIds);
  if (capabilities.length === capabilityIds.length) {
    return;
  }
  const found = new Set(capabilities.map((capability) => capability.id));
  throw new CapabilityNotFoundError(capabilityIds.find((id) => !found.has(id)));
}

/** Loads roles by id and throws RoleNotFoundError for the first id that is missing. */
async function assertRolesExist(
  roleRepository: RoleRepository,
  tenantId: string,
  roleIds: string[],
): Promise<void> {
  const roles = await roleRepository.listRolesByIds(tenantId, roleIds);
  if (roles.length === roleIds.length) {
    return;
  }
  const found = new Set(roles.map((role) => role.id));
  throw new RoleNotFoundError(roleIds.find((id) => !found.has(id)));
}

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
  const { username, email, recoveryTier } = normalizeIdentity(input);

  assertValidPassword(input.password);

  assertUuidArrayFields(input);

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

  const entitlementDeps: EntitlementDeps = {
    capabilityRepository: deps.capabilityRepository,
    tenantModuleEntitlementPort: deps.tenantModuleEntitlementPort,
    masterDataModuleCatalogPort: deps.masterDataModuleCatalogPort,
  };

  if (capabilityIds.length > 0) {
    await assertCapabilitiesExist(deps.capabilityRepository, capabilityIds);
    await assertRuntimeCapabilitiesEntitledForTenant(
      entitlementDeps,
      ctx.tenantId,
      capabilityIds,
      { cachePolicy: "bypass-cache", authorization: entitlementContext?.authorization },
    );
  }

  if (roleIds.length > 0) {
    await assertRolesExist(deps.roleRepository, ctx.tenantId, roleIds);
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
