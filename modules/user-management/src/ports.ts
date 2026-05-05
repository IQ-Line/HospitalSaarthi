/**
 * Port interfaces for User Management (Layer 3 platform data + AuthN adapter boundaries).
 * Implementations live in data-access / adapters; no DB or HTTP types here.
 */

/** Matches OpenAPI `User` / `components.schemas.User`. */
export interface User {
  id: string;
  full_name: string;
}

/** POST /users request body. */
export interface CreateUserInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
}

/** PATCH /users/{id} request body (partial). */
export interface UpdateUserInput {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
}

export interface UserRepository {
  createUser(tenantId: string, input: CreateUserInput): Promise<User>;
  getUserById(tenantId: string, userId: string): Promise<User | null>;
  updateUser(tenantId: string, userId: string, input: UpdateUserInput): Promise<User | null>;
}

/** POST /role-assignments 201 response shape. */
export interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
}

/** POST /role-assignments request body. */
export interface AssignRoleInput {
  user_id: string;
  role_id: string;
}

export interface RoleAssignmentRepository {
  assignRole(tenantId: string, input: AssignRoleInput): Promise<RoleAssignment>;
}

/** Verified JWT identity: platform `users.id` (`sub`) and `iq_tenant_id` for this session. */
export interface AuthContext {
  userId: string;
  tenantId: string;
}

/**
 * Wraps better-auth / JWT verification. Resolves `sub` and `iq_tenant_id` from the active request.
 */
export interface AuthProvider {
  getAuthContext(): Promise<AuthContext | null>;
}

/** GET /auth/principal `attributes` object. */
export interface PrincipalAttributes {
  iq_tenant_id: string;
  department: string | null;
  org_id: string | null;
  capabilities: string[];
  delegated_capabilities: string[];
  clearances: Record<string, string>;
}

/** GET /auth/principal response body. */
export interface Principal {
  id: string;
  roles: string[];
  attributes: PrincipalAttributes;
}

/**
 * Builds the PEP-enriched principal (JWT claims + cached AuthZ data per LLD §7).
 * Callers pass verified context from {@link AuthProvider}; enrichment uses User Management data.
 */
export interface PrincipalService {
  getPrincipal(context: AuthContext): Promise<Principal>;
}

export interface EventPublisher {
  publishUserCreated(tenantId: string, user: User): Promise<void>;
  publishRoleAssignmentChanged(tenantId: string, assignment: RoleAssignment): Promise<void>;
}
