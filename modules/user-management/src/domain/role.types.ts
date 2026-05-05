export type RoleStatus = "active" | "archived";

export type RoleScopeLevel = "tenant" | "organization";

export interface Role {
  id: string;
  iq_tenant_id: string;
  name: string;
  display_name: string;
  description: string | null;
  scope_level: RoleScopeLevel;
  is_system: boolean;
  status: RoleStatus;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateRoleData {
  iq_tenant_id: string;
  name: string;
  display_name: string;
  description?: string | null;
  scope_level?: RoleScopeLevel;
  created_by?: string | null;
}

export interface RoleAssignment {
  id: string;
  iq_tenant_id: string;
  user_id: string;
  role_id: string;
  scope_type: string | null;
  scope_id: string | null;
  assigned_at: Date;
  assigned_by: string;
  revoked_at: Date | null;
  revoked_by: string | null;
}

export interface AssignRoleData {
  iq_tenant_id: string;
  user_id: string;
  role_id: string;
  scope_type?: string | null;
  scope_id?: string | null;
  assigned_by: string;
}
