import { IntegrationNotFoundError, IntegrationStateError } from "../domain/errors.js";
import type { Integration, UpdateIntegrationInput } from "../domain/integration.types.js";
import { isUuid } from "../domain/uuid.js";
import { mergeIntegrationConfigUpdate } from "../lib/integration-config.js";
import type { IntegrationRepository } from "../ports.js";

export type UpdateIntegrationDeps = {
  integrationRepository: IntegrationRepository;
};

export type UpdateIntegrationContext = {
  tenantId: string;
  actorId: string;
};

export async function updateIntegration(
  deps: UpdateIntegrationDeps,
  ctx: UpdateIntegrationContext,
  integrationId: string,
  input: UpdateIntegrationInput,
): Promise<Integration> {
  const normalizedId = integrationId.trim();
  if (!isUuid(normalizedId)) {
    throw new IntegrationNotFoundError(integrationId);
  }

  const existing = await deps.integrationRepository.findById(ctx.tenantId, normalizedId);
  if (existing === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }

  if (existing.status === "disabled") {
    throw new IntegrationStateError(
      "integration_update_forbidden_disabled",
      existing.status,
    );
  }

  const displayName =
    input.display_name !== undefined ? input.display_name.trim() : existing.display_name;
  if (displayName.length === 0) {
    throw new IntegrationStateError("integration_display_name_empty", existing.status);
  }

  const allowSuggested = existing.status === "draft";
  const config =
    input.config !== undefined
      ? mergeIntegrationConfigUpdate(existing.config, input.config, {
          allowSuggestedCapabilityKeys: allowSuggested,
        })
      : existing.config;

  const updated = await deps.integrationRepository.update(
    ctx.tenantId,
    normalizedId,
    {
      display_name: displayName,
      config,
    },
    ctx.actorId,
  );
  if (updated === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }
  return updated;
}
