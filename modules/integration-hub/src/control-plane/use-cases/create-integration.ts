import {
  defaultAllowedOperationsForType,
  defaultSuggestedCapabilityKeysForType,
  getIntegrationTypeCatalogEntry,
} from "../domain/integration-type-catalog.js";
import { IntegrationValidationError } from "../domain/errors.js";
import type { CreateIntegrationInput, Integration } from "../domain/integration.types.js";
import { normalizeIntegrationConfig } from "../lib/integration-config.js";
import type { IntegrationRepository } from "../ports.js";

export type CreateIntegrationDeps = {
  integrationRepository: IntegrationRepository;
};

export type CreateIntegrationContext = {
  tenantId: string;
  actorId: string;
};

export async function createIntegration(
  deps: CreateIntegrationDeps,
  ctx: CreateIntegrationContext,
  input: CreateIntegrationInput,
): Promise<Integration> {
  const integrationType = input.integration_type?.trim() ?? "";
  if (integrationType.length === 0) {
    throw new IntegrationValidationError("integration_type_required");
  }

  const catalogEntry = getIntegrationTypeCatalogEntry(integrationType);
  if (catalogEntry === null) {
    throw new IntegrationValidationError("integration_type_unknown");
  }

  const displayName = input.display_name?.trim() ?? "";
  if (displayName.length === 0) {
    throw new IntegrationValidationError("integration_display_name_empty");
  }

  const config = normalizeIntegrationConfig(input.config, {
    allowedOperations: defaultAllowedOperationsForType(integrationType),
    suggestedCapabilityKeys: defaultSuggestedCapabilityKeysForType(integrationType),
  });

  return deps.integrationRepository.create(
    ctx.tenantId,
    {
      integration_type: integrationType,
      display_name: displayName,
      config,
    },
    ctx.actorId,
  );
}
