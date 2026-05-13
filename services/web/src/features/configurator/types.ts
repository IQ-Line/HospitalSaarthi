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
  contact_phone?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Selected master-data module IDs to attach to the default tenant (same transaction as org create). */
  tenant_modules?: Array<{ module_id: string; is_active: boolean }>;
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

export interface OrganizationCreateResponse {
  organization: Organization;
  default_tenant: {
    iq_tenant_id: string;
    org_id: string;
    name: string;
    slug: string;
    provisioning_status: string;
  };
  tenant_modules: TenantModule[];
}

/** Step 3 admin fields kept in client memory until a dedicated provisioning API exists. */
export interface TenantWizardAdminSnapshot {
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminMobile: string;
  sendInvitation: boolean;
  password?: string;
  confirmPassword?: string;
  welcomeMessage?: string;
}

export type OrganizationUpdateInput = Partial<
  Pick<
    OrganizationCreateInput,
    'name' | 'slug' | 'type' | 'status' | 'contact_email' | 'contact_phone' | 'address' | 'metadata'
  >
>;
