import type { OrganizationType } from "./organization.types.js";

/**
 * Input DTO for the tenant-onboarding endpoint.
 * Frontend submits ONE payload; backend orchestrates everything.
 */
export interface ProvisionTenantInput {
  organization: {
    id?: string;
    name?: string;
    slug?: string;
    type?: OrganizationType;
    contact_email?: string | null;
    website?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  tenant: {
    name: string;
    slug: string;
    parent_tenant_id?: string | null;
    type?: string;
    branch_code?: string | null;
    branch_type?: string | null;
    address_line1?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  plan?: {
    slug: string;
    trial_end_date?: string | null;
    max_users_override?: number | null;
    max_branches_override?: number | null;
  };
  modules: Array<{
    module_id: string;
    is_active: boolean;
  }>;
  admin: {
    first_name: string;
    last_name?: string | null;
    /** Username-primary login credential (required). Lowercase letters/digits/`.`/`_`, 3-30 chars. */
    username: string;
    /** Optional contact email — not the login credential (username-primary, ADR-0003). */
    email?: string | null;
    password: string;
    phone?: string | null;
  };
}

export interface ProvisionedRole {
  id: string;
  code: string;
  display_name: string;
  is_system: boolean;
}

export interface ProvisionedUser {
  id: string;
  /** Optional contact email (null when the admin has none — username-primary login). */
  email: string | null;
  full_name: string;
}

export interface ProvisionedTenant {
  iq_tenant_id: string;
  org_id: string;
  name: string;
  slug: string;
  provisioning_status: string;
}

export interface ProvisionedTenantModule {
  iq_tenant_id: string;
  module_id: string;
  is_active: boolean;
}

/**
 * Result DTO from a successful tenant provisioning.
 */
export interface ProvisionTenantResult {
  organization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  tenant: ProvisionedTenant;
  tenant_modules: ProvisionedTenantModule[];
  admin_role: ProvisionedRole;
  admin_user: ProvisionedUser;
  provisioning_status: "completed";
  correlation_id: string;
}

export const TENANT_ADMIN_ROLE_CODE = "tenant-admin" as const;
/** Master-data role-types picklist value (distinct from tenant-unique `code`). */
export const TENANT_ADMIN_ROLE_TYPE = "tenant-admin" as const;
export const TENANT_ADMIN_ROLE_DISPLAY_NAME = "Tenant Administrator" as const;
