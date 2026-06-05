import {
  IntegrationInvalidStateError,
  IntegrationNotFoundError,
  PartnerOrchestrationError,
} from "../domain/integration-errors.js";
import type { Integration } from "../domain/integration.types.js";
import type { IntegrationsRepository, PartnerPrincipalGateway } from "../ports.js";

export type ActivateIntegrationDeps = {
  integrationsRepository: IntegrationsRepository;
  partnerPrincipalGateway: PartnerPrincipalGateway;
};

export async function activateIntegration(
  deps: ActivateIntegrationDeps,
  input: {
    tenantId: string;
    integrationId: string;
    actorId: string | null;
    authorizationHeader: string;
  },
): Promise<Integration> {
  const existing = await deps.integrationsRepository.getById(input.tenantId, input.integrationId);
  if (!existing) {
    throw new IntegrationNotFoundError();
  }
  if (existing.status !== "draft") {
    throw new IntegrationInvalidStateError("Only draft integrations can be activated.");
  }

  const partner = await deps.partnerPrincipalGateway.provision({
    tenantId: input.tenantId,
    integrationId: existing.id,
    integrationDisplayName: existing.name,
    capabilityKeys: existing.config.capabilityKeys,
    authorizationHeader: input.authorizationHeader,
  });

  const activated = await deps.integrationsRepository.activate(
    input.tenantId,
    input.integrationId,
    partner.id,
    input.actorId,
  );
  if (!activated) {
    throw new PartnerOrchestrationError(
      "Integration activation failed after partner principal was provisioned.",
    );
  }
  return activated;
}
