export type IntegrationStatus = "draft" | "active" | "disabled";

export type ApiKeyStatus = "active" | "revoked";

/** Orchestration config only — never an authorization source post-activation (ADR-0032). */
export interface IntegrationConfig {
  allowedOperations: string[];
  /** UX defaults for activation; stripped after successful partner principal provision. */
  suggestedCapabilityKeys?: string[];
}

export interface Integration {
  integration_id: string;
  integration_type: string;
  display_name: string;
  status: IntegrationStatus;
  partner_principal_id: string | null;
  config: IntegrationConfig;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface IntegrationApiKey {
  api_key_id: string;
  integration_id: string;
  key_prefix: string;
  status: ApiKeyStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
  created_by: string | null;
}

export interface IssuedIntegrationApiKey extends IntegrationApiKey {
  /** Returned once at issue time; never persisted. */
  plaintext_secret: string;
}

export interface CreateIntegrationInput {
  integration_type: string;
  display_name: string;
  config?: Partial<IntegrationConfig>;
}

export interface UpdateIntegrationInput {
  display_name?: string;
  config?: Partial<IntegrationConfig>;
}

export interface IntegrationTypeCatalogEntry {
  type: string;
  display_name: string;
  default_allowed_operations: readonly string[];
  default_suggested_capability_keys: readonly string[];
}
