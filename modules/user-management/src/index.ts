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
  ListUsersOptions,
  PrincipalRoleProjectionRepository,
  UserReadListResourceAbac,
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
  CerbosPrincipalUnavailableError,
  DuplicateRoleAssignmentError,
  RoleAssignmentNotFoundError,
  InvalidRoleSeedError,
  RbacIntegrityViolationError,
  RoleNotFoundError,
  TenantMismatchError,
  UnexpectedPersistenceError,
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

export { DrizzleRoleAssignmentRepository } from "./data-access/role-assignment-repository.js";
export { DrizzlePrincipalRoleProjectionRepository } from "./data-access/drizzle-principal-role-projection-repository.js";
export { DrizzleRoleRepository } from "./data-access/role-repository.js";
export { DrizzleUserRepository } from "./data-access/user-repository.js";
export { InMemoryRoleRepository } from "./data-access/in-memory-role-repository.js";
export { InMemoryPrincipalRoleProjectionRepository } from "./data-access/in-memory-principal-role-projection-repository.js";
export { InMemoryRoleAssignmentRepository } from "./data-access/in-memory-role-assignment-repository.js";
export { InMemoryUserRepository } from "./data-access/in-memory-user-repository.js";
export { DrizzleAbacAttributeRepository } from "./data-access/drizzle-abac-attribute-repository.js";
export { InMemoryAbacAttributeRepository } from "./data-access/in-memory-abac-attribute-repository.js";
export { createDefaultPrincipalService } from "./services/default-principal-service.js";
export type { DefaultPrincipalServiceDeps } from "./services/default-principal-service.js";
export { DefaultPrincipalService } from "./services/default-principal-service.js";
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
export { deactivateUser } from "./use-cases/deactivate-user.js";
export type { DeactivateUserDeps } from "./use-cases/deactivate-user.js";
export { revokeRole } from "./use-cases/revoke-role.js";
export type { RevokeRoleDeps, RevokeRoleContext } from "./use-cases/revoke-role.js";
export { AUTHENTICATE_LOCAL_PHASE_1A_OWNER } from "./use-cases/authenticate-local.js";
export { FEDERATE_LOGIN_PHASE_1A_OWNER } from "./use-cases/federate-login.js";
export {
  USER_MANAGEMENT_EVENT_CONTRACTS,
  USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION,
} from "./events/contracts.js";
