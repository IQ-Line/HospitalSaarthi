import {
  IntegrationApiKeyNotFoundError,
  IntegrationNotFoundError,
} from "../domain/errors.js";
import type { IntegrationApiKey } from "../domain/integration.types.js";
import { isUuid } from "../domain/uuid.js";
import type { IntegrationApiKeyRepository, IntegrationRepository } from "../ports.js";

export type RevokeApiKeyDeps = {
  integrationRepository: IntegrationRepository;
  integrationApiKeyRepository: IntegrationApiKeyRepository;
};

export type RevokeApiKeyContext = {
  tenantId: string;
  actorId: string;
};

export async function revokeApiKey(
  deps: RevokeApiKeyDeps,
  ctx: RevokeApiKeyContext,
  integrationId: string,
  apiKeyId: string,
): Promise<IntegrationApiKey> {
  const normalizedIntegrationId = integrationId.trim();
  const normalizedApiKeyId = apiKeyId.trim();
  if (!isUuid(normalizedIntegrationId)) {
    throw new IntegrationNotFoundError(integrationId);
  }
  if (!isUuid(normalizedApiKeyId)) {
    throw new IntegrationApiKeyNotFoundError(apiKeyId);
  }

  const integration = await deps.integrationRepository.findById(
    ctx.tenantId,
    normalizedIntegrationId,
  );
  if (integration === null) {
    throw new IntegrationNotFoundError(normalizedIntegrationId);
  }

  const revoked = await deps.integrationApiKeyRepository.revoke(
    ctx.tenantId,
    normalizedIntegrationId,
    normalizedApiKeyId,
    ctx.actorId,
  );
  if (revoked === null) {
    throw new IntegrationApiKeyNotFoundError(normalizedApiKeyId);
  }
  return revoked;
}
