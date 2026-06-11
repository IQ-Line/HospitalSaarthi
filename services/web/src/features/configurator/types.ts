export type OrganizationType =
  | 'hospital_chain'
  | 'medical_college'
  | 'standalone_hospital'
  | 'government_network';

export type OrganizationStatus = 'active' | 'suspended' | 'decommissioned';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  status: OrganizationStatus;
  contact_email: string | null;
  website: string | null;
  contact_phone: string | null;
  address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface OrganizationListResponse {
  data: Organization[];
  total: number;
}

export interface OrganizationCreateInput {
  name: string;
  slug: string;
  type: OrganizationType;
  status?: OrganizationStatus;
  contact_email?: string | null;
  website?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TenantModule {
  iq_tenant_id: string;
  module_id: string;
  is_active: boolean;
  is_core_override: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/** POST /organizations returns the created organisation row only. */
export type OrganizationCreateResponse = Organization;

export type OrganizationUpdateInput = Partial<
  Pick<
    OrganizationCreateInput,
    'name' | 'slug' | 'type' | 'status' | 'contact_email' | 'website' | 'contact_phone' | 'address' | 'metadata'
  >
>;

export type ConfiguratorBranchType = 'hub_lab' | 'hub' | 'satellite';

export type ConfiguratorTenantType = 'full_platform' | 'fragmented' | 'lite';

export interface ConfiguratorTenant {
  iq_tenant_id: string;
  org_id: string;
  parent_tenant_id: string | null;
  name: string;
  slug: string;
  type: ConfiguratorTenantType;
  provisioning_status: string;
  data_isolation_level: string;
  cerbos_scope_key: string;
  timezone: string;
  locale: string;
  metadata: Record<string, unknown> | null;
  branch_code: string | null;
  branch_type: ConfiguratorBranchType | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  free_follow_up_days: number;
  free_follow_up_visits: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ConfiguratorTenantListResponse {
  data: ConfiguratorTenant[];
  total: number;
}

export interface CreateConfiguratorTenantInput {
  org_id: string;
  parent_tenant_id: string;
  name: string;
  slug: string;
  type: ConfiguratorTenantType;
  cerbos_scope_key: string;
  branch_code: string;
  branch_type: ConfiguratorBranchType;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  metadata?: Record<string, unknown> | null;
}
