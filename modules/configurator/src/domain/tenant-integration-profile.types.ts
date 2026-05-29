export type IntegrationKind = "abdm";

export interface TenantIntegrationProfile {
  id: string;
  iq_tenant_id: string;
  integration_kind: IntegrationKind;
  is_active: boolean;
  hip_id: string;
  hiu_id: string;
  cm_id: string;
  client_id: string | null;
  client_secret: string | null;
  default_sms_phone: string | null;
  hip_display_name: string | null;
  callback_base_url: string | null;
  sms_provider: string | null;
  sms_config: Record<string, unknown>;
  gateway_environment: string;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateTenantIntegrationProfileData {
  iq_tenant_id: string;
  integration_kind: IntegrationKind;
  is_active?: boolean;
  hip_id: string;
  hiu_id: string;
  cm_id?: string;
  client_id?: string | null;
  client_secret?: string | null;
  default_sms_phone?: string | null;
  hip_display_name?: string | null;
  callback_base_url?: string | null;
  sms_provider?: string | null;
  sms_config?: Record<string, unknown>;
  gateway_environment?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface UpdateTenantIntegrationProfileData {
  is_active?: boolean;
  hip_id?: string;
  hiu_id?: string;
  cm_id?: string;
  client_id?: string | null;
  client_secret?: string | null;
  default_sms_phone?: string | null;
  hip_display_name?: string | null;
  callback_base_url?: string | null;
  sms_provider?: string | null;
  sms_config?: Record<string, unknown>;
  gateway_environment?: string;
  updated_by?: string | null;
}

export interface TenantIntegrationProfileFilters {
  iq_tenant_id: string;
  integration_kind?: IntegrationKind;
  is_active?: boolean;
}
