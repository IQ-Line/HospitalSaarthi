export type OrganizationType =
  | "hospital_chain"
  | "medical_college"
  | "standalone_hospital"
  | "government_network";

export type OrganizationStatus = "active" | "suspended" | "decommissioned";

/**
 * Optional structured payload stored in `Organization.metadata` when provisioning
 * via the tenant wizard (until dedicated columns or events exist).
 */
export interface TenantOrganizationWizardMetadata {
  gstin?: string | null;
  pan?: string | null;
  website?: string | null;
  address_detail?: {
    hq_line1: string;
    locality?: string | null;
    block?: string | null;
    district: string;
    state: string;
    pin_code: string;
  };
  provisioning?: {
    plan_slug: string;
    module_override_ids: string[];
    trial_end_date?: string | null;
    max_users_override?: number | null;
    max_branches_override?: number | null;
  };
}

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
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateOrganizationData {
  name: string;
  slug: string;
  type: OrganizationType;
  status?: OrganizationStatus;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  /** May include {@link TenantOrganizationWizardMetadata} from the admin UI wizard. */
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
}

export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
  type?: OrganizationType;
  status?: OrganizationStatus;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  /** May include {@link TenantOrganizationWizardMetadata} from the admin UI wizard. */
  metadata?: Record<string, unknown> | null;
  updated_by?: string | null;
}

export interface OrganizationFilters {
  status?: OrganizationStatus;
  type?: OrganizationType;
}
