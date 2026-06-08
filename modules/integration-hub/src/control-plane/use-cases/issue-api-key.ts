import { IntegrationNotFoundError, IntegrationStateError } from "../domain/errors.js";
import type { IssuedIntegrationApiKey } from "../domain/integration.types.js";
import { isUuid } from "../domain/uuid.js";
import { generateApiKeyMaterial, type ApiKeyEnvironment } from "../lib/api-key-crypto.js";
import type { IntegrationApiKeyRepository, IntegrationRepository } from "../ports.js";

export type IssueApiKeyDeps = {
  integrationRepository: IntegrationRepository;
  integrationApiKeyRepository: IntegrationApiKeyRepository;
  apiKeyEnvironment: ApiKeyEnvironment;
};

export type IssueApiKeyContext = {
  tenantId: string;
  actorId: string;
};

export type IssueApiKeyInput = {
  expires_at?: string | null;
};

export async function issueApiKey(
  deps: IssueApiKeyDeps,
  ctx: IssueApiKeyContext,
  integrationId: string,
  input: IssueApiKeyInput = {},
): Promise<IssuedIntegrationApiKey> {
  const normalizedId = integrationId.trim();
  if (!isUuid(normalizedId)) {
    throw new IntegrationNotFoundError(integrationId);
  }

  const integration = await deps.integrationRepository.findById(ctx.tenantId, normalizedId);
  if (integration === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }
  if (integration.status !== "active") {
    throw new IntegrationStateError("integration_api_key_issue_active_only", integration.status);
  }

  const material = generateApiKeyMaterial(deps.apiKeyEnvironment);
  const issued = await deps.integrationApiKeyRepository.issue(
    ctx.tenantId,
    normalizedId,
    {
      key_prefix: material.prefix,
      key_hash: material.key_hash,
      expires_at: input.expires_at ?? null,
      actorId: ctx.actorId,
    },
  );

  return {
    ...issued,
    plaintext_secret: material.plaintext_secret,
  };
}
