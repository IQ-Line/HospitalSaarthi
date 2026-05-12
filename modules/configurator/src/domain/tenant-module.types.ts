export interface TenantModule {
  iq_tenant_id: string;
  module_id: string;
  is_enabled: boolean;
  is_core_override: boolean;
  enabled_at: Date | null;
  disabled_at: Date | null;
  enabled_by: string | null;
  created_at: Date;
  updated_at: Date;
  updated_by: string | null;
}

export interface CreateTenantModuleData {
  iq_tenant_id: string;
  module_id: string;
  is_enabled?: boolean;
  is_core_override?: boolean;
  enabled_by?: string | null;
  updated_by?: string | null;
}

export interface UpdateTenantModuleData {
  is_enabled?: boolean;
  is_core_override?: boolean;
  enabled_at?: Date | null;
  disabled_at?: Date | null;
  enabled_by?: string | null;
  updated_by?: string | null;
}

export interface TenantModuleFilters {
  iq_tenant_id: string;
  is_enabled?: boolean;
}

export interface TenantModuleKey {
  iq_tenant_id: string;
  module_id: string;
}
