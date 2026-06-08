import { defaultSuggestedCapabilityKeysForType } from "../domain/integration-type-catalog.js";
import {
  IntegrationNotFoundError,
  IntegrationStateError,
  IntegrationValidationError,
} from "../domain/errors.js";
import type { Integration } from "../domain/integration.types.js";
import { isUuid } from "../domain/uuid.js";
import {
  resolveSuggestedCapabilityKeysForActivation,
  stripSuggestedCapabilityKeys,
} from "../lib/integration-config.js";
import type { IntegrationRepository, UserManagementPartnerGateway } from "../ports.js";

export type ActivateIntegrationDeps = {
  integrationRepository: IntegrationRepository;
  userManagementPartnerGateway: UserManagementPartnerGateway;
};

export type ActivateIntegrationContext = {
  tenantId: string;
  actorId: string;
  authorization: string;
};

export async function activateIntegration(
  deps: ActivateIntegrationDeps,
  ctx: ActivateIntegrationContext,
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
  if (existing.status !== "draft") {
    throw new IntegrationStateError("integration_activate_draft_only", existing.status);
  }

  const suggestedKeys = resolveSuggestedCapabilityKeysForActivation(
    existing.config,
    defaultSuggestedCapabilityKeysForType(existing.integration_type),
  );
  if (suggestedKeys.length === 0) {
    throw new IntegrationValidationError("integration_suggested_capability_keys_required");
  }

  const principal = await deps.userManagementPartnerGateway.provisionPartnerPrincipal(
    { tenantId: ctx.tenantId, authorization: ctx.authorization },
    {
      integration_id: normalizedId,
      integration_display_name: existing.display_name,
      suggested_capability_keys: suggestedKeys,
    },
  );

  const activatedConfig = stripSuggestedCapabilityKeys(existing.config);
  const activated = await deps.integrationRepository.activate(
    ctx.tenantId,
    normalizedId,
    {
      partner_principal_id: principal.id,
      config: activatedConfig,
      actorId: ctx.actorId,
    },
  );

  if (activated === null) {
    throw new IntegrationStateError(
      "integration_activate_race",
      existing.status,
      "Integration is no longer draft — partner principal may have been provisioned; reconcile manually",
    );
  }

  return activated;
}
