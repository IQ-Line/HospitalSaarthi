export type TenantType = "full_platform" | "fragmented" | "lite";

export type ProvisioningStatus =
  | "provisioning"
  | "active"
  | "suspended"
  | "decommissioned";

export type DataIsolationLevel = "shared" | "isolated";

export interface Tenant {
  iq_tenant_id: string;
  org_id: string;
  parent_tenant_id: string | null;
  name: string;
  slug: string;
  type: TenantType;
  provisioning_status: ProvisioningStatus;
  data_isolation_level: DataIsolationLevel;
  cerbos_scope_key: string;
  timezone: string;
  locale: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateTenantData {
  org_id: string;
  parent_tenant_id?: string | null;
  name: string;
  slug: string;
  type: TenantType;
  provisioning_status?: ProvisioningStatus;
  data_isolation_level?: DataIsolationLevel;
  cerbos_scope_key: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
}

export interface UpdateTenantData {
  org_id?: string;
  parent_tenant_id?: string | null;
  name?: string;
  slug?: string;
  type?: TenantType;
  provisioning_status?: ProvisioningStatus;
  data_isolation_level?: DataIsolationLevel;
  cerbos_scope_key?: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, unknown> | null;
  updated_by?: string | null;
}

export interface TenantFilters {
  org_id?: string;
  provisioning_status?: ProvisioningStatus;
  type?: TenantType;
}
