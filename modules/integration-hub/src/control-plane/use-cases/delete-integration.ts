import { IntegrationNotFoundError, IntegrationStateError } from "../domain/errors.js";
import { isUuid } from "../domain/uuid.js";
import type { IntegrationRepository } from "../ports.js";

export type DeleteIntegrationDeps = {
  integrationRepository: IntegrationRepository;
};

export async function deleteIntegration(
  deps: DeleteIntegrationDeps,
  tenantId: string,
  integrationId: string,
): Promise<void> {
  const normalizedId = integrationId.trim();
  if (!isUuid(normalizedId)) {
    throw new IntegrationNotFoundError(integrationId);
  }

  const existing = await deps.integrationRepository.findById(tenantId, normalizedId);
  if (existing === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }
  if (existing.status !== "draft") {
    throw new IntegrationStateError("integration_delete_draft_only", existing.status);
  }

  const deleted = await deps.integrationRepository.deleteDraft(tenantId, normalizedId);
  if (!deleted) {
    throw new IntegrationNotFoundError(normalizedId);
  }
}
