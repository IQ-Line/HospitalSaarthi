import type {
  ApiKeyStatus,
  CreateIntegrationInput,
  Integration,
  IntegrationApiKey,
  IssuedApiKey,
  UpdateIntegrationInput,
} from "./domain/integration.types.js";

export interface IntegrationsRepository {
  create(
    tenantId: string,
    input: CreateIntegrationInput & {
      direction: string;
      config: Integration["config"];
      createdBy: string | null;
    },
  ): Promise<Integration>;
  getById(tenantId: string, integrationId: string): Promise<Integration | null>;
  list(tenantId: string): Promise<Integration[]>;
  update(
    tenantId: string,
    integrationId: string,
    patch: UpdateIntegrationInput & { updatedBy: string | null },
  ): Promise<Integration | null>;
  deleteDraft(tenantId: string, integrationId: string): Promise<boolean>;
  activate(
    tenantId: string,
    integrationId: string,
    partnerPrincipalId: string,
    updatedBy: string | null,
  ): Promise<Integration | null>;
  disable(tenantId: string, integrationId: string, updatedBy: string | null): Promise<Integration | null>;
  disableWithKeyRevocation(
    tenantId: string,
    integrationId: string,
    updatedBy: string | null,
  ): Promise<Integration | null>;
  reactivate(tenantId: string, integrationId: string, updatedBy: string | null): Promise<Integration | null>;
}

export interface IntegrationApiKeysRepository {
  issue(
    tenantId: string,
    input: {
      integrationId: string;
      keyPrefix: string;
      keyHash: string;
      label: string;
      plaintextKey: string;
      createdBy: string | null;
      rateLimitRpm?: number | null;
      expiresAt?: Date | null;
    },
  ): Promise<IssuedApiKey>;
  listByIntegration(tenantId: string, integrationId: string): Promise<IntegrationApiKey[]>;
  revoke(
    tenantId: string,
    integrationId: string,
    apiKeyId: string,
    revokedBy: string | null,
  ): Promise<IntegrationApiKey | null>;
  revokeAllActiveForIntegration(
    tenantId: string,
    integrationId: string,
    revokedBy: string | null,
  ): Promise<number>;
  countActiveByIntegration(tenantId: string, integrationId: string): Promise<number>;
  findByPrefix(keyPrefix: string): Promise<
    | (IntegrationApiKey & {
        key_hash: string;
        integration_status: Integration["status"];
      })
    | null
  >;
}

export type PartnerPrincipalUser = {
  id: string;
  full_name: string;
  status: string;
};

export interface PartnerPrincipalGateway {
  provision(input: {
    tenantId: string;
    integrationId: string;
    integrationDisplayName: string;
    capabilityKeys: string[];
    authorizationHeader: string;
  }): Promise<PartnerPrincipalUser>;
  deactivate(input: {
    tenantId: string;
    integrationId: string;
    authorizationHeader: string;
  }): Promise<PartnerPrincipalUser | null>;
  reactivate(input: {
    tenantId: string;
    integrationId: string;
    authorizationHeader: string;
  }): Promise<PartnerPrincipalUser | null>;
}
