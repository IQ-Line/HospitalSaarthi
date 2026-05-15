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
  role_ids?: string[];
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

export type RoleAssignment = {
  id: string;
  user_id: string;
  role_id: string;
};

export type AssignRoleBody = {
  user_id: string;
  role_id: string;
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
};

export type UmRole = {
  id: string;
  code: string;
  display_name: string;
  description?: string | null;
  is_system: boolean;
  status: RoleStatus;
};

export type CreateRoleBody = {
  code: string;
  display_name: string;
  description?: string | null;
  is_system?: boolean;
  status?: RoleStatus;
};

export type UpdateRoleBody = {
  code?: string;
  display_name?: string;
  description?: string | null;
  is_system?: boolean;
  status?: RoleStatus;
};

export type ReplaceRoleCapabilitiesBody = {
  capability_ids: string[];
};
