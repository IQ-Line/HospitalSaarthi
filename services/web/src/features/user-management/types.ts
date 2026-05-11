/** Shapes aligned with `specs/openapi/user-management.v1.yaml` (subset used by the SPA). */

export type UserStatus = 'active' | 'inactive' | 'suspended';

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
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  org_id?: string | null;
  department?: string | null;
  clearance_tier_required?: number;
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
