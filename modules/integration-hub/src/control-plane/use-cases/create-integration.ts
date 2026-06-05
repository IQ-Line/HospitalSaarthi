import { IntegrationTypeUnknownError } from "../domain/integration-errors.js";
import { resolveIntegrationType } from "../domain/integration-type-catalog.js";
import type { CreateIntegrationInput, Integration } from "../domain/integration.types.js";
import type { IntegrationsRepository } from "../ports.js";

export type CreateIntegrationDeps = {
  integrationsRepository: IntegrationsRepository;
};

export async function createIntegration(
  deps: CreateIntegrationDeps,
  tenantId: string,
  actorId: string | null,
  input: CreateIntegrationInput,
): Promise<Integration> {
  const typeDef = resolveIntegrationType(input.integration_type);
  if (!typeDef) {
    throw new IntegrationTypeUnknownError(input.integration_type);
  }

  const config = {
    allowedOperations:
      input.config?.allowedOperations ?? typeDef.default_config.allowedOperations,
    capabilityKeys: input.config?.capabilityKeys ?? typeDef.default_config.capabilityKeys,
  };

  return deps.integrationsRepository.create(tenantId, {
    name: input.name,
    integration_type: typeDef.integration_type,
    direction: input.direction ?? typeDef.direction,
    config,
    createdBy: actorId,
  });
}
