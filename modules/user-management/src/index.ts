/**
 * User Management module — plugin for HTTP routing; repository adapters for service composition.
 */
export { buildCerbosUserMgmtResourceAttr } from "./authz/cerbos-resource-attr.js";
export type { CerbosUserMgmtResourceAttrInput } from "./authz/cerbos-resource-attr.js";
export { userManagementPlugin } from "./router.js";
export type { UserManagementPluginOptions } from "./router.js";
export {
  principalRoleEnricherPlugin,
} from "./principal-role-enricher-plugin.js";
export type {
  PrincipalRoleEnricherPluginOptions,
} from "./principal-role-enricher-plugin.js";
export type {
  AuthAccountProvisioner,
  AppliedRoleTemplate,
  CapabilityRepository,
  CreatePasswordAuthAccountInput,
  CreatePasswordAuthAccountResult,
  ListUsersOptions,
  PrincipalRoleProjectionRepository,
  PrincipalAuthorizationRepository,
  RoleCapabilityRepository,
  ReplaceUserCapabilitiesInput,
  UserReadListResourceAbac,
  UserAccessRepository,
  UserCapabilitiesSnapshot,
  UserCapabilityGrant,
  UserEffectiveCapabilities,
  UserWithTenant,
} from "./ports/index.js";
export {
  loadIdentityJwtClaims,
  type IdentityJwtClaims,
  type IdentityJwtClaimsDeps,
} from "./authn/identity-jwt-claims.js";
export {
  compareCanonicalRoleCodes,
  normalizeRoleCode,
} from "./domain/normalize-role-code.js";
export {
  UM_CAPABILITY_READ,
  UM_ROLE_ASSIGN,
  UM_ROLE_CREATE,
  UM_ROLE_READ,
  UM_ROLE_UPDATE,
  UM_USER_CREATE,
  UM_USER_DEACTIVATE,
  UM_USER_READ,
  UM_USER_UPDATE,
} from "./domain/user-management-capabilities.js";
export {
  AuthEmailConflictError,
  CerbosPrincipalUnavailableError,
  DuplicateRoleAssignmentError,
  DuplicateUserRoleTemplateError,
  DuplicateRoleCodeError,
  CapabilityNotFoundError,
  RoleAssignmentNotFoundError,
  InvalidRoleSeedError,
  RbacIntegrityViolationError,
  RoleInUseError,
  RoleNotFoundError,
  TenantMismatchError,
  UnexpectedPersistenceError,
  UserRoleTemplateNotFoundError,
  UserManagementError,
  UserNotFoundError,
  ValidationError,
} from "./domain/errors.js";
export type { ValidationIssue } from "./domain/errors.js";
export {
  replyWithUserManagementError,
  resolveUserManagementHttpError,
} from "./http/map-user-management-error.js";
export type {
  ResolvedUserManagementHttpError,
  UserManagementErrorBody,
} from "./http/map-user-management-error.js";

export { DrizzleCapabilityRepository } from "./data-access/capability-repository.js";
export { DrizzleRoleCapabilityRepository } from "./data-access/role-capability-repository.js";
export { DrizzleRoleAssignmentRepository } from "./data-access/role-assignment-repository.js";
export { DrizzleUserAccessRepository } from "./data-access/user-access-repository.js";
export { DrizzlePrincipalRoleProjectionRepository } from "./data-access/drizzle-principal-role-projection-repository.js";
export { DrizzleRoleRepository } from "./data-access/role-repository.js";
export { DrizzleUserRepository } from "./data-access/user-repository.js";
export { InMemoryCapabilityRepository } from "./data-access/in-memory-capability-repository.js";
export { InMemoryUserAccessRepository } from "./data-access/in-memory-user-access-repository.js";
export { InMemoryRoleRepository } from "./data-access/in-memory-role-repository.js";
export { InMemoryRoleCapabilityRepository } from "./data-access/in-memory-role-capability-repository.js";
export { InMemoryPrincipalRoleProjectionRepository } from "./data-access/in-memory-principal-role-projection-repository.js";
export { InMemoryRoleAssignmentRepository } from "./data-access/in-memory-role-assignment-repository.js";
export { InMemoryUserRepository } from "./data-access/in-memory-user-repository.js";
export { DrizzlePrincipalAuthorizationRepository } from "./data-access/principal-authorization-repository.js";
export { InMemoryPrincipalAuthorizationRepository } from "./data-access/in-memory-principal-authorization-repository.js";
export { createDefaultPrincipalService } from "./services/default-principal-service.js";
export type { DefaultPrincipalServiceDeps } from "./services/default-principal-service.js";
export { DefaultPrincipalService } from "./services/default-principal-service.js";
export {
  capabilities,
  delegated_capability_grants,
  role_assignments,
  role_capabilities,
  roles,
  user_capabilities,
  user_roles,
  userManagementSchema,
  user_clearances,
  users,
} from "./schema/tables.js";
export {
  USER_MANAGEMENT_EVENT_TYPES,
  USER_MANAGEMENT_EVENT_USER_CREATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
  USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
  USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
  USER_MANAGEMENT_EVENT_ROLE_REVOKED,
} from "./events/constants.js";
export { getPrincipal } from "./use-cases/get-principal.js";
export type { GetPrincipalDeps } from "./use-cases/get-principal.js";
export { createRole } from "./use-cases/create-role.js";
export type { CreateRoleDeps } from "./use-cases/create-role.js";
export { applyRoleTemplate } from "./use-cases/apply-role-template.js";
export type { ApplyRoleTemplateDeps } from "./use-cases/apply-role-template.js";
export { deactivateUser } from "./use-cases/deactivate-user.js";
export type { DeactivateUserDeps } from "./use-cases/deactivate-user.js";
export { deleteRole } from "./use-cases/delete-role.js";
export type { DeleteRoleDeps } from "./use-cases/delete-role.js";
export { detachRoleTemplate } from "./use-cases/detach-role-template.js";
export type { DetachRoleTemplateDeps } from "./use-cases/detach-role-template.js";
export { getCapabilityById } from "./use-cases/get-capability.js";
export type { GetCapabilityDeps } from "./use-cases/get-capability.js";
export { getUserCapabilities } from "./use-cases/get-user-capabilities.js";
export type { GetUserCapabilitiesDeps } from "./use-cases/get-user-capabilities.js";
export { getUserEffectiveCapabilities } from "./use-cases/get-user-effective-capabilities.js";
export type { GetUserEffectiveCapabilitiesDeps } from "./use-cases/get-user-effective-capabilities.js";
export { getRoleById } from "./use-cases/get-role.js";
export type { GetRoleDeps } from "./use-cases/get-role.js";
export { getRoleCapabilities } from "./use-cases/get-role-capabilities.js";
export type { GetRoleCapabilitiesDeps } from "./use-cases/get-role-capabilities.js";
export { listCapabilities } from "./use-cases/list-capabilities.js";
export type { ListCapabilitiesDeps } from "./use-cases/list-capabilities.js";
export { listRoleAssignments } from "./use-cases/list-role-assignments.js";
export type { ListRoleAssignmentsDeps } from "./use-cases/list-role-assignments.js";
export { listRoles } from "./use-cases/list-roles.js";
export type { ListRolesDeps } from "./use-cases/list-roles.js";
export { listUserRoles } from "./use-cases/list-user-roles.js";
export type { ListUserRolesDeps } from "./use-cases/list-user-roles.js";
export { replaceRoleCapabilities } from "./use-cases/replace-role-capabilities.js";
export type { ReplaceRoleCapabilitiesDeps } from "./use-cases/replace-role-capabilities.js";
export { replaceUserCapabilities } from "./use-cases/replace-user-capabilities.js";
export type { ReplaceUserCapabilitiesDeps } from "./use-cases/replace-user-capabilities.js";
export { revokeRole } from "./use-cases/revoke-role.js";
export type { RevokeRoleDeps, RevokeRoleContext } from "./use-cases/revoke-role.js";
export { updateRole } from "./use-cases/update-role.js";
export type { UpdateRoleDeps } from "./use-cases/update-role.js";
export { AUTHENTICATE_LOCAL_PHASE_1A_OWNER } from "./use-cases/authenticate-local.js";
export { FEDERATE_LOGIN_PHASE_1A_OWNER } from "./use-cases/federate-login.js";
export {
  USER_MANAGEMENT_EVENT_CONTRACTS,
  USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION,
} from "./events/contracts.js";
