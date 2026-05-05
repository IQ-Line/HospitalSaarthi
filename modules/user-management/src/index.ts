export { createRouter } from "./router.js";
export type { UserManagementRouterOptions } from "./router.js";

export type {
  User,
  CreateUserData,
  UpdateUserData,
  UserFilters,
  UserStatus,
  UserKind,
  RecoveryTier,
} from "./domain/user.types.js";

export type {
  Role,
  CreateRoleData,
  RoleAssignment,
  AssignRoleData,
  RoleStatus,
  RoleScopeLevel,
} from "./domain/role.types.js";

export type {
  Session,
  CreateSessionData,
} from "./domain/session.types.js";

export type { UserRepo, RoleRepo, SessionRepo } from "./ports.js";

export { DrizzleUserRepo } from "./data-access/user.repo.js";
export { DrizzleRoleRepo } from "./data-access/role.repo.js";

export {
  userManagementSchema,
  users,
  roles,
  capabilities,
  roleCapabilities,
  roleAssignments,
  userDepartmentAssignments,
  delegations,
  userClearances,
  departmentProjection,
  idpConfigurations,
  scimSyncState,
  delegatedRecoveryRoutes,
  authIdentityLinks,
  permissionChangeAudit,
  baUsers,
  baSessions,
  baAccounts,
  jwks,
} from "./schema/tables.js";
