export type TenantType = "full_platform" | "fragmented" | "lite";

export type BranchType = "hub_lab" | "hub" | "satellite";

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
  branch_code: string | null;
  branch_type: BranchType | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  contact_phone: string | null;
  contact_email: string | null;
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
  branch_code?: string | null;
  branch_type?: BranchType | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
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
  branch_type?: BranchType | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  updated_by?: string | null;
}

export interface TenantFilters {
  org_id?: string;
  /** When true, only tenants with no parent (organization root tenants). */
  is_root?: boolean;
  /** Only tenants whose parent is this tenant id (e.g. branches under root). */
  parent_tenant_id?: string;
  provisioning_status?: ProvisioningStatus;
  type?: TenantType;
}
