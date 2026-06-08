import { IntegrationNotFoundError, IntegrationStateError } from "../domain/errors.js";
import type { Integration } from "../domain/integration.types.js";
import { isUuid } from "../domain/uuid.js";
import type { IntegrationRepository, UserManagementPartnerGateway } from "../ports.js";

export type ReactivateIntegrationDeps = {
  integrationRepository: IntegrationRepository;
  userManagementPartnerGateway: UserManagementPartnerGateway;
};

export type ReactivateIntegrationContext = {
  tenantId: string;
  actorId: string;
  authorization: string;
};

export async function reactivateIntegration(
  deps: ReactivateIntegrationDeps,
  ctx: ReactivateIntegrationContext,
  integrationId: string,
): Promise<Integration> {
  const normalizedId = integrationId.trim();
  if (!isUuid(normalizedId)) {
    throw new IntegrationNotFoundError(integrationId);
  }

  const existing = await deps.integrationRepository.findById(ctx.tenantId, normalizedId);
  if (existing === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }
  if (existing.status !== "disabled") {
    throw new IntegrationStateError("integration_reactivate_disabled_only", existing.status);
  }

  await deps.userManagementPartnerGateway.reactivatePartnerPrincipal(
    { tenantId: ctx.tenantId, authorization: ctx.authorization },
    normalizedId,
  );

  const reactivated = await deps.integrationRepository.setStatus(
    ctx.tenantId,
    normalizedId,
    "active",
    ctx.actorId,
  );
  if (reactivated === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }
  return reactivated;
}
