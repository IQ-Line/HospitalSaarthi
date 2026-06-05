import { ValidationError } from "../domain/errors.js";
import type { PartnerPrincipal } from "../domain/types.js";
import { isUuid } from "../domain/uuid.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";

export type DeactivatePartnerPrincipalDeps = {
  partnerPrincipalRepository: PartnerPrincipalRepository;
};

export async function deactivatePartnerPrincipal(
  deps: DeactivatePartnerPrincipalDeps,
  tenantId: string,
  integrationId: string,
  actorId: string,
): Promise<PartnerPrincipal | null> {
  const normalized = integrationId.trim();
  if (!isUuid(normalized)) {
    throw new ValidationError("partner_integration_id_invalid");
  }

  return deps.partnerPrincipalRepository.deactivateByIntegrationId(
    tenantId,
    normalized,
    actorId,
  );
}
