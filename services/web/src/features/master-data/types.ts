export type ModuleCategory = 'core' | 'clinical' | 'administrative' | 'support';
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage';

export interface Module {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: ModuleCategory;
  version: string;
  level: number;
  icon: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleListResponse {
  data: Module[];
  total: number;
}

export interface ModuleSingleResponse {
  data: Module;
}

export interface ModuleCreateInput {
  name: string;
  slug: string;
  category: ModuleCategory;
  version?: string;
  description?: string | null;
  parent_id?: string | null;
  icon?: string | null;
  is_active?: boolean;
}

export interface ModuleUpdateInput {
  name?: string;
  slug?: string;
  category?: ModuleCategory;
  version?: string;
  description?: string | null;
  parent_id?: string | null;
  icon?: string | null;
  is_active?: boolean;
  is_deleted?: boolean;
}

export interface Permission {
  id: string;
  name: string;
  slug: string;
  action: PermissionAction;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionListResponse {
  data: Permission[];
  total: number;
}

export interface PermissionSingleResponse {
  data: Permission;
}

export interface PermissionCreateInput {
  name: string;
  slug: string;
  action: PermissionAction;
  description?: string | null;
  is_active?: boolean;
}

export interface PermissionUpdateInput {
  name?: string;
  slug?: string;
  action?: PermissionAction;
  description?: string | null;
  is_active?: boolean;
  is_deleted?: boolean;
}

export interface SystemRole {
  id: string;
  name: string;
  slug: string;
  is_template: boolean;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemRoleListResponse {
  data: SystemRole[];
  total: number;
}

export interface SystemRoleSingleResponse {
  data: SystemRole;
}

export interface SystemRoleCreateInput {
  name: string;
  slug: string;
  description?: string | null;
  is_template?: boolean;
  is_active?: boolean;
}

export interface SystemRoleUpdateInput {
  name?: string;
  slug?: string;
  description?: string | null;
  is_template?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
}

export interface ModulePermission {
  id: string;
  slug: string;
  module_id: string;
  permission_id: string;
  is_default: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModulePermissionListResponse {
  data: ModulePermission[];
  total: number;
}

export interface ModulePermissionSingleResponse {
  data: ModulePermission;
}

export interface ModulePermissionCreateInput {
  slug: string;
  module_id: string;
  permission_id: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface ModulePermissionUpdateInput {
  slug?: string;
  is_default?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
}

export type DepartmentType = 'clinical' | 'diagnostic' | 'administrative' | 'support';

export interface Department {
  id: string;
  iq_tenant_id: string | null;
  name: string;
  code: string;
  type: DepartmentType;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentListResponse {
  data: Department[];
  total: number;
}
