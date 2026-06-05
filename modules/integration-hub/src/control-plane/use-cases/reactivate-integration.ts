import { IntegrationInvalidStateError, IntegrationNotFoundError } from "../domain/integration-errors.js";
import type { Integration } from "../domain/integration.types.js";
import type { IntegrationsRepository, PartnerPrincipalGateway } from "../ports.js";

export type ReactivateIntegrationDeps = {
  integrationsRepository: IntegrationsRepository;
  partnerPrincipalGateway: PartnerPrincipalGateway;
};

export async function reactivateIntegration(
  deps: ReactivateIntegrationDeps,
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
  if (existing.status !== "disabled") {
    throw new IntegrationInvalidStateError("Only disabled integrations can be reactivated.");
  }

  await deps.partnerPrincipalGateway.reactivate({
    tenantId: input.tenantId,
    integrationId: input.integrationId,
    authorizationHeader: input.authorizationHeader,
  });

  const reactivated = await deps.integrationsRepository.reactivate(
    input.tenantId,
    input.integrationId,
    input.actorId,
  );
  if (!reactivated) {
    throw new IntegrationInvalidStateError("Integration could not be reactivated.");
  }
  return reactivated;
}
