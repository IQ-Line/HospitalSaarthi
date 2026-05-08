export type ModuleCategory = 'core' | 'clinical' | 'administrative' | 'support';

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

export interface SystemRole {
  id: string;
  name: string;
  slug: string;
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
