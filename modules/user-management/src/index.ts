/**
 * User Management module — plugin for HTTP routing; repository adapters for service composition.
 */
export { userManagementPlugin } from "./router.js";
export type { UserManagementPluginOptions } from "./router.js";

export { DrizzleRoleAssignmentRepository } from "./data-access/role-assignment-repository.js";
export { DrizzleUserRepository } from "./data-access/user-repository.js";
export { InMemoryRoleAssignmentRepository } from "./data-access/in-memory-role-assignment-repository.js";
export { InMemoryUserRepository } from "./data-access/in-memory-user-repository.js";
