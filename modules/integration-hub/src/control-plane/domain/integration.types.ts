export type IntegrationDirection = "inbound" | "outbound" | "bidirectional";

export type IntegrationStatus = "draft" | "active" | "disabled";

export type ApiKeyStatus = "active" | "revoked" | "expired";

/** Partner ingress allowlist entries: `{spec}.{operationId}` from OpenAPI. */
export type IntegrationConfig = {
  allowedOperations: string[];
  capabilityKeys: string[];
};

export type Integration = {
  id: string;
  iq_tenant_id: string;
  name: string;
  integration_type: string;
  direction: IntegrationDirection;
  status: IntegrationStatus;
  partner_principal_id: string | null;
  config: IntegrationConfig;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationApiKey = {
  id: string;
  iq_tenant_id: string;
  integration_id: string;
  key_prefix: string;
  label: string;
  status: ApiKeyStatus;
  rate_limit_rpm: number | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
  revoked_by: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type IssuedApiKey = IntegrationApiKey & {
  /** Plaintext key — returned once at issuance only. */
  api_key: string;
};

export type CreateIntegrationInput = {
  name: string;
  integration_type: string;
  direction?: IntegrationDirection;
  config?: Partial<IntegrationConfig>;
};

export type UpdateIntegrationInput = {
  name?: string;
  config?: Partial<IntegrationConfig>;
};
