export interface TenantModule {
  iq_tenant_id: string;
  module_id: string;
  is_active: boolean;
  is_core_override: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateTenantModuleData {
  iq_tenant_id: string;
  module_id: string;
  is_active?: boolean;
  is_core_override?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface UpdateTenantModuleData {
  is_active?: boolean;
  is_core_override?: boolean;
  updated_by?: string | null;
}

export interface TenantModuleFilters {
  iq_tenant_id: string;
  is_active?: boolean;
}

export interface TenantModuleKey {
  iq_tenant_id: string;
  module_id: string;
}
