/**
 * Port interfaces (repositories, auth adapters). Data shapes live in `domain/types.ts`.
 */

import type {
  AssignRoleInput,
  AuthContext,
  CreateUserInput,
  Principal,
  RoleAssignment,
  UpdateUserInput,
  User,
  UserStatus,
} from "../domain/types.js";

export type {
  AssignRoleInput,
  AuthContext,
  CreateUserInput,
  Principal,
  PrincipalAttributes,
  RoleAssignment,
  UpdateUserInput,
  User,
  UserStatus,
} from "../domain/types.js";

export interface UserRepository {
  createUser(tenantId: string, input: CreateUserInput): Promise<User>;
  getUserById(tenantId: string, userId: string): Promise<User | null>;
  updateUser(tenantId: string, userId: string, input: UpdateUserInput): Promise<User | null>;
}

export interface RoleAssignmentRepository {
  assignRole(tenantId: string, input: AssignRoleInput): Promise<RoleAssignment>;
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
