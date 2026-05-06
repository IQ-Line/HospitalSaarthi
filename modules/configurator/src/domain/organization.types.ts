export type OrganizationType =
  | "hospital_chain"
  | "medical_college"
  | "standalone_hospital"
  | "government_network";

export type OrganizationStatus = "active" | "suspended" | "decommissioned";

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
  metadata?: Record<string, unknown> | null;
  updated_by?: string | null;
}

export interface OrganizationFilters {
  status?: OrganizationStatus;
  type?: OrganizationType;
}
