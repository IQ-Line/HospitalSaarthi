/**
 * Domain data shapes (entities, inputs, auth context) — no behavior, no infrastructure.
 */

/** Lifecycle state for platform user rows (LLD MVP). */
export type UserStatus = "active" | "inactive" | "suspended";

/** Matches OpenAPI `User` / `components.schemas.User`; `email` / `phone` are persisted fields for projections/events. */
export interface User {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  auth_user_id?: string | null;
  username?: string | null;
  org_id?: string | null;
  status: UserStatus;
}

/** Tenant-scoped RBAC role entity. */
export interface Role {
  id: string;
  code: string;
  display_name: string;
}

/** POST /users request body. */
export interface CreateUserInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  org_id?: string | null;
}

/** PATCH /users/{id} request body (partial). */
export interface UpdateUserInput {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  org_id?: string | null;
  status?: UserStatus;
  auth_user_id?: string | null;
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

/**
 * Verified identity for principal resolution: normalized ids plus optional host payload.
 * `requestUser` is Fastify `request.user` when the host registers identity middleware (e.g. JWT).
 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  /** Raw verified identity on the request (`request.user`), shape defined by the host / identity plugin. */
  requestUser?: unknown;
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
