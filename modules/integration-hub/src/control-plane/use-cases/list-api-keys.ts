import { IntegrationNotFoundError } from "../domain/errors.js";
import type { IntegrationApiKey } from "../domain/integration.types.js";
import { isUuid } from "../domain/uuid.js";
import type { IntegrationApiKeyRepository, IntegrationRepository } from "../ports.js";

export type ListApiKeysDeps = {
  integrationRepository: IntegrationRepository;
  integrationApiKeyRepository: IntegrationApiKeyRepository;
};

export async function listApiKeys(
  deps: ListApiKeysDeps,
  tenantId: string,
  integrationId: string,
): Promise<IntegrationApiKey[]> {
  const normalizedId = integrationId.trim();
  if (!isUuid(normalizedId)) {
    throw new IntegrationNotFoundError(integrationId);
  }

  const integration = await deps.integrationRepository.findById(tenantId, normalizedId);
  if (integration === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }

  return deps.integrationApiKeyRepository.listByIntegration(tenantId, normalizedId);
}
