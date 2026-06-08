import type {
  CreateIntegrationInput,
  Integration,
  IntegrationApiKey,
  IssuedIntegrationApiKey,
  UpdateIntegrationInput,
} from "./domain/integration.types.js";

export interface IntegrationRepository {
  create(
    tenantId: string,
    input: CreateIntegrationInput & { config: Integration["config"] },
    actorId: string,
  ): Promise<Integration>;

  update(
    tenantId: string,
    integrationId: string,
    input: UpdateIntegrationInput & { config?: Integration["config"] },
    actorId: string,
  ): Promise<Integration | null>;

  findById(tenantId: string, integrationId: string): Promise<Integration | null>;

  list(tenantId: string): Promise<Integration[]>;

  deleteDraft(tenantId: string, integrationId: string): Promise<boolean>;

  activate(
    tenantId: string,
    integrationId: string,
    input: {
      partner_principal_id: string;
      config: Integration["config"];
      actorId: string;
    },
  ): Promise<Integration | null>;

  setStatus(
    tenantId: string,
    integrationId: string,
    status: Integration["status"],
    actorId: string,
  ): Promise<Integration | null>;
}

export interface IntegrationApiKeyRepository {
  listByIntegration(tenantId: string, integrationId: string): Promise<IntegrationApiKey[]>;

  issue(
    tenantId: string,
    integrationId: string,
    input: {
      key_prefix: string;
      key_hash: string;
      expires_at: string | null;
      actorId: string;
    },
  ): Promise<IssuedIntegrationApiKey>;

  revoke(
    tenantId: string,
    integrationId: string,
    apiKeyId: string,
    actorId: string,
  ): Promise<IntegrationApiKey | null>;

  revokeAllActiveForIntegration(
    tenantId: string,
    integrationId: string,
    actorId: string,
  ): Promise<number>;

  /** Data plane — prefix is globally unique per issued key. */
  findActiveByPrefix(prefix: string): Promise<ApiKeyAuthRecord | null>;

  touchLastUsedAt(tenantId: string, apiKeyId: string): Promise<void>;
}

/** API key row fields required for inbound authentication. */
export interface ApiKeyAuthRecord {
  api_key_id: string;
  iq_tenant_id: string;
  integration_id: string;
  key_hash: string;
  expires_at: string | null;
}

export interface ProvisionPartnerPrincipalResult {
  id: string;
  full_name: string;
  kind: "partner";
  integration_id: string;
  status: string;
}

export interface UserManagementPartnerGateway {
  provisionPartnerPrincipal(
    ctx: { tenantId: string; authorization: string },
    input: {
      integration_id: string;
      integration_display_name: string;
      suggested_capability_keys: string[];
    },
  ): Promise<ProvisionPartnerPrincipalResult>;

  deactivatePartnerPrincipal(
    ctx: { tenantId: string; authorization: string },
    integrationId: string,
  ): Promise<ProvisionPartnerPrincipalResult | null>;

  reactivatePartnerPrincipal(
    ctx: { tenantId: string; authorization: string },
    integrationId: string,
  ): Promise<ProvisionPartnerPrincipalResult | null>;
}
