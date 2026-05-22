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
};

export type CreateUserBody = {
  full_name: string;
  email: string;
  password: string;
  phone?: string | null;
  username?: string | null;
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
  display_name: string;
  description?: string | null;
  role_type?: string | null;
  is_system: boolean;
  status: RoleStatus;
};

export type CreateRoleBody = {
  code: string;
  display_name: string;
  description?: string | null;
  role_type?: string | null;
  is_system?: boolean;
  status?: RoleStatus;
};

export type UpdateRoleBody = {
  code?: string;
  display_name?: string;
  description?: string | null;
  role_type?: string | null;
  is_system?: boolean;
  status?: RoleStatus;
};

export type ReplaceRoleCapabilitiesBody = {
  capability_ids: string[];
};

export type ReplaceUserCapabilitiesBody = {
  capability_ids: string[];
};

export type ApplyRoleTemplateBody = {
  role_id: string;
  role_template_capability_ids?: string[];
};

export type UserCapabilityGrantSource = 'manual' | 'role_template' | 'delegated' | 'system';

export type AppliedRoleTemplate = {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by_user_id: string | null;
  assigned_at: string;
  role: UmRole;
};

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
  grant_source: UserCapabilityGrantSource;
  source_role_id: string | null;
  granted_by_user_id: string | null;
  granted_at: string;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
};

export type UserCapabilitiesSnapshot = {
  direct_grants: UserCapabilityGrant[];
  copied_grants: UserCapabilityGrant[];
  role_templates: AppliedRoleTemplate[];
};

export type UserEffectiveCapabilities = {
  capability_keys: string[];
  delegated_capability_keys: string[];
  clearances: Record<string, string>;
  um_clearance_effective_tier: number;
};
