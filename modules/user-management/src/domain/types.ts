/**
 * Domain data shapes (entities, inputs, auth context) — no behavior, no infrastructure.
 */

/** Lifecycle state for platform user rows (LLD MVP). */
export type UserStatus = "active" | "inactive" | "suspended";
export type RoleStatus = "active" | "inactive";
export type UserCapabilityGrantSource = "manual" | "role_template" | "delegated" | "system";

/** Password recovery routing tier (Phase 1: standard + admin_only in use). */
export type RecoveryTier =
  | "standard"
  | "admin_only"
  | "delegated"
  | "phone_recovery"
  | "federated";

/** Matches OpenAPI `User` / `components.schemas.User`; `email` / `phone` are persisted fields for projections/events. */
export interface User {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  auth_user_id?: string | null;
  username?: string | null;
  /** Account-recovery tier (authn spec §3.2); MVP emits 'standard' | 'admin_only'. */
  recovery_tier?: RecoveryTier;
  /** Forces password change on next login when set by admin reset. */
  must_change_password?: boolean;
  org_id?: string | null;
  /** Department for ABAC; persisted profile field (JWT may also carry `department`). */
  department?: string | null;
  /**
   * Minimum principal clearance tier (derived from `clearances` map) required for sensitive
   * user.read / user.update / user.deactivate. 0 = standard record. Sent to Cerbos as `resource.attr.required_clearance`.
   */
  clearance_tier_required?: number;
  status: UserStatus;
  role_display_names?: string[];
}

/** Canonical machine-readable authorization primitive managed as data and consumed by Cerbos. */
export interface Capability {
  id: string;
  /** Cerbos / PDP vocabulary (e.g. `users:users:read`). Stable once granted. */
  capability_key: string;
  /** Master Data `modules.slug` (kebab-case). */
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description?: string | null;
  is_active: boolean;
  /** Future MD sync: originating module slug when imported from catalog. */
  source_module_slug?: string | null;
  /** Future MD sync: originating `permissions.slug` when imported from catalog. */
  source_permission_slug?: string | null;
  /** Future MD sync: catalog system of record. */
  source_catalog?: "master_data" | null;
}

/** Tenant-scoped flat container of capabilities. */
export interface Role {
  id: string;
  code: string;
  /** Master-data role-types picklist value; not unique per tenant. */
  role_type: string;
  display_name: string;
  description?: string | null;
  is_system: boolean;
  status: RoleStatus;
}

/** POST /users request body. */
export interface CreateUserInput {
  full_name: string;
  email?: string | null;
  password?: string;
  phone?: string | null;
  username?: string | null;
  org_id?: string | null;
  department?: string | null;
  /** 0–3; higher tiers require stronger principal clearances for read/update/delete. */
  clearance_tier_required?: number;
  /** Direct user capability grants to persist immediately after creation. */
  capability_ids?: string[];
  /** Optional role-template ids to apply immediately after creation. */
  role_template_ids?: string[];
  /**
   * Optional subset of capabilities to grant from the role template(s).
   * When set, `role_template_ids` must contain exactly one id, and each entry must belong to that role.
   */
  role_template_capability_ids?: string[];
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
  must_change_password?: boolean;
}

export interface CreateRoleInput {
  code: string;
  role_type: string;
  display_name: string;
  description?: string | null;
  is_system?: boolean;
  status?: RoleStatus;
}

export interface UpdateRoleInput {
  code?: string;
  role_type?: string;
  display_name?: string;
  description?: string | null;
  is_system?: boolean;
  status?: RoleStatus;
}

export interface ReplaceRoleCapabilitiesInput {
  capability_ids: string[];
}

export interface ReplaceUserCapabilitiesInput {
  capability_ids: string[];
}

export interface AppliedRoleTemplate {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by_user_id: string | null;
  assigned_at: string;
  role: Role;
}

export interface UserCapabilityGrant {
  id: string;
  user_id: string;
  capability_id: string;
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description?: string | null;
  grant_source: UserCapabilityGrantSource;
  source_role_id: string | null;
  granted_by_user_id: string | null;
  granted_at: string;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
}

export interface UserCapabilitiesSnapshot {
  direct_grants: UserCapabilityGrant[];
  copied_grants: UserCapabilityGrant[];
  role_templates: AppliedRoleTemplate[];
}

export interface UserEffectiveCapabilities {
  capability_keys: string[];
  delegated_capability_keys: string[];
  clearances: Record<string, string>;
  um_clearance_effective_tier: number;
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
  /** Forwarded `Authorization` header for Configurator/Master Data entitlement lookups. */
  authorization?: string;
  /** When `bypass-cache`, entitlement resolver skips TTL cache (post module toggle). */
  entitlementCachePolicy?: "use-cache" | "bypass-cache";
}

/** GET /auth/principal `attributes` object. */
export interface PrincipalAttributes {
  iq_tenant_id: string;
  department: string | null;
  org_id: string | null;
  /**
   * Canonical role codes for ABAC (JWT ∪ DB projection). Cerbos policies must use this
   * (not Cerbos `principal.roles`, which may be `__hims_authenticated__` only).
   */
  role_codes: string[];
  /**
   * Bounded platform authority scopes (e.g. `["platform"]`); `[]` for ordinary tenant users.
   * Derived from `platform_admins` membership. PDP rules ADDITIVELY allow platform-provisioning
   * actions when this contains `"platform"` — clinical resources are intentionally never scoped.
   */
  scopes: string[];
  capabilities: string[];
  delegated_capabilities: string[];
  clearances: Record<string, string>;
  /** Max clearance tier (0–3) derived from the `clearances` map; compared to resource `required_clearance`. */
  um_clearance_effective_tier: number;
  /**
   * Fingerprint of tenant entitlement capability keys (ADR-0032). Present when entitlement
   * intersection is enabled; SPA may compare to detect module enablement changes.
   */
  tenant_entitlement_revision?: string;
}

/** GET /auth/principal response body. */
export interface Principal {
  id: string;
  roles: string[];
  attributes: PrincipalAttributes;
}
