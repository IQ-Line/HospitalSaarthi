/**
 * Port interfaces (repositories, auth adapters). Data shapes live in `domain/types.ts`.
 */

import type {
  AssignRoleInput,
  AuthContext,
  CreateUserInput,
  Principal,
  Role,
  RoleAssignment,
  UpdateUserInput,
  User,
  UserStatus,
} from "../domain/types.js";

import type { UserReadListResourceAbac } from "../domain/user-read-list-resource-filter.js";

export type {
  AssignRoleInput,
  AuthContext,
  CreateUserInput,
  Principal,
  PrincipalAttributes,
  Role,
  RoleAssignment,
  UpdateUserInput,
  User,
  UserStatus,
} from "../domain/types.js";

export type { UserReadListResourceAbac };

export type ListUsersOptions = {
  /** When set, repository applies SQL/in-memory resource ABAC aligned with `user.read` (department + clearance). */
  userReadResourceAbac?: UserReadListResourceAbac;
};

/** Platform user plus owning tenant (for JWT `iq_tenant_id` resolution by global user id). */
export type UserWithTenant = User & { iq_tenant_id: string };

export interface UserRepository {
  createUser(tenantId: string, input: CreateUserInput): Promise<User>;
  getUserById(tenantId: string, userId: string): Promise<User | null>;
  /**
   * Resolves a platform user by primary key alone. Prefer tenant-scoped {@link getUserById} when
   * tenant is known; this exists for auth issuance where `sub` is the only stable key on the token.
   */
  findUserByGlobalId(userId: string): Promise<UserWithTenant | null>;
  listUsers(tenantId: string, options?: ListUsersOptions): Promise<User[]>;
  updateUser(tenantId: string, userId: string, input: UpdateUserInput): Promise<User | null>;
}

/**
 * Tenant-scoped ABAC attributes sourced from User Management persistence (LLD §6–7).
 */
export interface AbacAttributeRepository {
  listRoleCapabilitiesForUser(tenantId: string, userId: string): Promise<string[]>;
  getClearances(tenantId: string, userId: string): Promise<Record<string, string>>;
  listDelegatedCapabilities(tenantId: string, userId: string): Promise<string[]>;
}

export interface RoleRepository {
  getRoleById(tenantId: string, roleId: string): Promise<Role | null>;
}

/**
 * Tenant-scoped projection of assigned role codes for principal enrichment.
 * Implementations should use a single round-trip (e.g. JOIN) so the auth path stays O(1) in queries.
 * Additional RBAC dimensions (capabilities, scoped grants) can extend the same query with further JOINs.
 */
export interface PrincipalRoleProjectionRepository {
  listRoleCodesByUser(tenantId: string, userId: string): Promise<string[]>;
  /** Clears instance-scoped projection cache (e.g. after role mutations in the same process). */
  clearCache(): void;
}

export interface RoleAssignmentRef {
  tenant_id: string;
  user_id: string;
  role_id: string;
}

export interface RoleAssignmentRepository {
  assignRole(tenantId: string, input: AssignRoleInput): Promise<RoleAssignment>;
  revokeRole(
    tenantId: string,
    input: AssignRoleInput,
  ): Promise<RoleAssignment | null>;
  listAssignments(): Promise<RoleAssignmentRef[]>;
  listAssignmentsByUser(tenantId: string, userId: string): Promise<RoleAssignmentRef[]>;
}

/**
 * Wraps better-auth / JWT verification. Resolves `sub` and `iq_tenant_id` from the active request.
 */
export interface AuthProvider {
  getAuthContext(): Promise<AuthContext | null>;
}

/**
 * Builds the PEP-enriched principal (JWT claims + cached AuthZ data per LLD §7).
 * Callers pass verified context from {@link AuthProvider}; {@link AuthContext.requestUser} carries
 * the host’s `request.user` (e.g. JWT-derived principal) when supplied.
 */
export interface PrincipalService {
  getPrincipal(context: AuthContext): Promise<Principal>;
}
