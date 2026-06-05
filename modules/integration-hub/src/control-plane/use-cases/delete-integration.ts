import {
  IntegrationInvalidStateError,
  IntegrationNotFoundError,
} from "../domain/integration-errors.js";
import type { IntegrationApiKeysRepository, IntegrationsRepository } from "../ports.js";

export type DeleteIntegrationDeps = {
  integrationsRepository: IntegrationsRepository;
  integrationApiKeysRepository: IntegrationApiKeysRepository;
};

export async function deleteIntegration(
  deps: DeleteIntegrationDeps,
  tenantId: string,
  integrationId: string,
): Promise<void> {
  const existing = await deps.integrationsRepository.getById(tenantId, integrationId);
  if (!existing) {
    throw new IntegrationNotFoundError();
  }
  if (existing.status !== "draft") {
    throw new IntegrationInvalidStateError("Only draft integrations can be deleted.");
  }

  const activeKeys = await deps.integrationApiKeysRepository.countActiveByIntegration(
    tenantId,
    integrationId,
  );
  if (activeKeys > 0) {
    throw new IntegrationInvalidStateError("Cannot delete integration with active API keys.");
  }

  const deleted = await deps.integrationsRepository.deleteDraft(tenantId, integrationId);
  if (!deleted) {
    throw new IntegrationNotFoundError();
  }
}
