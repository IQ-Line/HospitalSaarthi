import { IntegrationNotFoundError } from "../domain/errors.js";
import type { Integration } from "../domain/integration.types.js";
import { isUuid } from "../domain/uuid.js";
import type { IntegrationRepository } from "../ports.js";

export type GetIntegrationDeps = {
  integrationRepository: IntegrationRepository;
};

export async function getIntegration(
  deps: GetIntegrationDeps,
  tenantId: string,
  integrationId: string,
): Promise<Integration> {
  const normalizedId = integrationId.trim();
  if (!isUuid(normalizedId)) {
    throw new IntegrationNotFoundError(integrationId);
  }
  const row = await deps.integrationRepository.findById(tenantId, normalizedId);
  if (row === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }
  return row;
}
