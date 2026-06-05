import { IntegrationInvalidStateError, IntegrationNotFoundError } from "../domain/integration-errors.js";
import type { Integration } from "../domain/integration.types.js";
import type { IntegrationsRepository, PartnerPrincipalGateway } from "../ports.js";

export type DisableIntegrationDeps = {
  integrationsRepository: IntegrationsRepository;
  partnerPrincipalGateway: PartnerPrincipalGateway;
};

export async function disableIntegration(
  deps: DisableIntegrationDeps,
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
  if (existing.status !== "active") {
    throw new IntegrationInvalidStateError("Only active integrations can be disabled.");
  }

  const disabled = await deps.integrationsRepository.disableWithKeyRevocation(
    input.tenantId,
    input.integrationId,
    input.actorId,
  );
  if (!disabled) {
    throw new IntegrationInvalidStateError("Integration could not be disabled.");
  }

  await deps.partnerPrincipalGateway.deactivate({
    tenantId: input.tenantId,
    integrationId: input.integrationId,
    authorizationHeader: input.authorizationHeader,
  });

  return disabled;
}
