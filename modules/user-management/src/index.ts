/**
 * User Management module — plugin for HTTP routing; repository adapters for service composition.
 */
export { userManagementPlugin } from "./router.js";
export type { UserManagementPluginOptions } from "./router.js";
export {
  principalRoleEnricherPlugin,
} from "./principal-role-enricher-plugin.js";
export type {
  PrincipalRoleEnricherPluginOptions,
} from "./principal-role-enricher-plugin.js";
export type { PrincipalRoleProjectionRepository } from "./ports/index.js";
export {
  compareCanonicalRoleCodes,
  normalizeRoleCode,
} from "./domain/normalize-role-code.js";
export {
  DuplicateRoleAssignmentError,
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

export {
  USER_MANAGEMENT_EVENT_TYPES,
  USER_MANAGEMENT_EVENT_USER_CREATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
  USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
  USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
  USER_MANAGEMENT_EVENT_ROLE_REVOKED,
} from "./events/constants.js";
export {
  USER_MANAGEMENT_EVENT_CONTRACTS,
} from "./events/contracts.js";
