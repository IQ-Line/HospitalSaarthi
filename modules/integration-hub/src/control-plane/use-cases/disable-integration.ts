import { IntegrationNotFoundError, IntegrationStateError } from "../domain/errors.js";
import type { Integration } from "../domain/integration.types.js";
import { isUuid } from "../domain/uuid.js";
import type {
  IntegrationApiKeyRepository,
  IntegrationRepository,
  UserManagementPartnerGateway,
} from "../ports.js";

export type DisableIntegrationDeps = {
  integrationRepository: IntegrationRepository;
  integrationApiKeyRepository: IntegrationApiKeyRepository;
  userManagementPartnerGateway: UserManagementPartnerGateway;
};

export type DisableIntegrationContext = {
  tenantId: string;
  actorId: string;
  authorization: string;
};

export async function disableIntegration(
  deps: DisableIntegrationDeps,
  ctx: DisableIntegrationContext,
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
  if (existing.status !== "active") {
    throw new IntegrationStateError("integration_disable_active_only", existing.status);
  }

  await deps.integrationApiKeyRepository.revokeAllActiveForIntegration(
    ctx.tenantId,
    normalizedId,
    ctx.actorId,
  );

  await deps.userManagementPartnerGateway.deactivatePartnerPrincipal(
    { tenantId: ctx.tenantId, authorization: ctx.authorization },
    normalizedId,
  );

  const disabled = await deps.integrationRepository.setStatus(
    ctx.tenantId,
    normalizedId,
    "disabled",
    ctx.actorId,
  );
  if (disabled === null) {
    throw new IntegrationNotFoundError(normalizedId);
  }
  return disabled;
}
