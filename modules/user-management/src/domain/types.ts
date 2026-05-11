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
  /** Department for ABAC; persisted profile field (JWT may also carry `department`). */
  department?: string | null;
  /**
   * Minimum principal clearance tier (derived from `clearances` map) required for sensitive
   * user.read / user.update / user.delete. 0 = standard record. Sent to Cerbos as `resource.attr.required_clearance`.
   */
  clearance_tier_required?: number;
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
  department?: string | null;
  /** 0–3; higher tiers require stronger principal clearances for read/update/delete. */
  clearance_tier_required?: number;
}

/** PATCH /users/{id} request body (partial). */
export interface UpdateUserInput {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  org_id?: string | null;
  department?: string | null;
  clearance_tier_required?: number;
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
  /** Max clearance tier (0–3) derived from the `clearances` map; compared to resource `required_clearance`. */
  um_clearance_effective_tier: number;
}

/** GET /auth/principal response body. */
export interface Principal {
  id: string;
  roles: string[];
  attributes: PrincipalAttributes;
}
