export type TenantApiKeyPurpose = "opd_slip";
export type TenantApiKeyStatus = "active" | "disabled" | "revoked";
export type TenantApiKeyEnvironment = "live" | "test";

export interface TenantApiKey {
  api_key_id: string;
  iq_tenant_id: string;
  key_prefix: string;
  label: string | null;
  purpose: TenantApiKeyPurpose;
  environment: TenantApiKeyEnvironment;
  status: TenantApiKeyStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateTenantApiKeyData {
  iq_tenant_id: string;
  key_prefix: string;
  key_hash: string;
  label?: string | null;
  purpose?: TenantApiKeyPurpose;
  environment: TenantApiKeyEnvironment;
  expires_at?: string | null;
  created_by?: string | null;
}

export interface UpdateTenantApiKeyStatusData {
  status: TenantApiKeyStatus;
  updated_by?: string | null;
}

export interface TenantApiKeyFilters {
  iq_tenant_id: string;
  status?: TenantApiKeyStatus;
  purpose?: TenantApiKeyPurpose;
}

export interface TenantApiKeyCreateResult extends TenantApiKey {
  /** Plaintext secret — returned once at creation only. */
  secret: string;
}
