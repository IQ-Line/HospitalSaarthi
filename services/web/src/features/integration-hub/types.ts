export type IntegrationStatus = 'draft' | 'active' | 'disabled';

export type IntegrationConfig = {
  allowedOperations: string[];
  suggestedCapabilityKeys?: string[];
};

export type Integration = {
  integration_id: string;
  integration_type: string;
  display_name: string;
  status: IntegrationStatus;
  partner_principal_id: string | null;
  config: IntegrationConfig;
  created_at?: string;
  updated_at?: string;
};

export type IntegrationTypeCatalogEntry = {
  type: string;
  display_name: string;
  default_allowed_operations: string[];
  default_suggested_capability_keys: string[];
};

export type PartnerOperationCatalogEntry = {
  id: string;
  group: string;
  label: string;
  description: string;
  inbound_path: string;
};

export type IntegrationTypeCatalogResponse = {
  items: IntegrationTypeCatalogEntry[];
  partner_operations: PartnerOperationCatalogEntry[];
};

export type IntegrationApiKey = {
  api_key_id: string;
  integration_id: string;
  key_prefix: string;
  status: 'active' | 'revoked';
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type IssuedIntegrationApiKey = IntegrationApiKey & {
  plaintext_secret: string;
};

export type CreateIntegrationBody = {
  integration_type: string;
  display_name: string;
  config?: Partial<IntegrationConfig>;
};
