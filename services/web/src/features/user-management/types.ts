/** Shapes aligned with `specs/openapi/user-management.v1.yaml` (subset used by the SPA). */

export type UserStatus = 'active' | 'inactive' | 'suspended';
export type RoleStatus = 'active' | 'inactive';

export type UmUser = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  auth_user_id?: string | null;
  username?: string | null;
  org_id?: string | null;
  department?: string | null;
  clearance_tier_required?: number;
  status: UserStatus;
  must_change_password?: boolean;
  role_display_names?: string[];
};

export type CreateUserBody = {
  full_name: string;
  /** Username-primary login handle (required). Lowercase letters/digits/`.`/`_`, 3-30 chars. */
  username: string;
  /** Optional business-contact email; not a login credential. */
  email?: string | null;
  password: string;
  phone?: string | null;
  org_id?: string | null;
  department?: string | null;
  clearance_tier_required?: number;
  capability_ids?: string[];
  role_template_ids?: string[];
  /** Subset of role capabilities; requires exactly one `role_template_ids` entry when present. */
  role_template_capability_ids?: string[];
};

export type UpdateUserBody = {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  org_id?: string | null;
  department?: string | null;
  clearance_tier_required?: number;
  status?: UserStatus;
  auth_user_id?: string | null;
};

export type ResetUserPasswordBody = {
  new_password: string;
};

export type Capability = {
  id: string;
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description?: string | null;
  is_active: boolean;
  source_module_slug?: string | null;
  source_permission_slug?: string | null;
  source_catalog?: "master_data" | null;
};

export type UmRole = {
  id: string;
  code: string;
  role_type: string;
  display_name: string;
  description?: string | null;
  is_system: boolean;
  status: RoleStatus;
};

export type CreateRoleBody = {
  code: string;
  role_type: string;
  display_name: string;
  description?: string | null;
  is_system?: boolean;
  status?: RoleStatus;
};

export type UpdateRoleBody = {
  code?: string;
  role_type?: string;
  display_name?: string;
  description?: string | null;
  is_system?: boolean;
  status?: RoleStatus;
};

export type ReplaceRoleCapabilitiesBody = {
  capability_ids: string[];
};

/** One entry in a PUT /users/{id}/capabilities grant/deny override list (ADR-0037). */
export type CapabilityOverrideInput = {
  capability_id: string;
  reason?: string | null;
};

/**
 * PUT /users/{id}/capabilities body (ADR-0037). Full-replace of the user's grant/deny overrides.
 * A capability in both lists resolves as deny (deny wins).
 */
export type ReplaceUserCapabilitiesBody = {
  grant_overrides: CapabilityOverrideInput[];
  deny_overrides: CapabilityOverrideInput[];
};

export type ApplyRoleTemplateBody = {
  role_id: string;
  role_template_capability_ids?: string[];
};

/** A capability override pins a capability on ('grant') or off ('deny') for one user (ADR-0037). */
export type CapabilityOverrideEffect = 'grant' | 'deny';

export type AppliedRoleTemplate = {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by_user_id: string | null;
  assigned_at: string;
  role: UmRole;
};

/** A single per-user capability override row (ADR-0037). */
export type UserCapabilityGrant = {
  id: string;
  user_id: string;
  capability_id: string;
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  description?: string | null;
  effect: CapabilityOverrideEffect;
  reason: string | null;
  granted_by_user_id: string | null;
  granted_at: string;
};

export type UserCapabilitiesSnapshot = {
  grant_overrides: UserCapabilityGrant[];
  deny_overrides: UserCapabilityGrant[];
  role_templates: AppliedRoleTemplate[];
};

export type UserEffectiveCapabilities = {
  capability_keys: string[];
  delegated_capability_keys: string[];
  clearances: Record<string, string>;
  um_clearance_effective_tier: number;
};
