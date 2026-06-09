import { ValidationError } from "../domain/errors.js";
import type { PartnerPrincipal } from "../domain/types.js";
import { isUuid } from "../domain/uuid.js";
import type { UserRepository } from "../ports/index.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";
import { resolveGrantActorIdForTenant } from "./resolve-grant-actor-id-for-tenant.js";

export type ReactivatePartnerPrincipalDeps = {
  partnerPrincipalRepository: PartnerPrincipalRepository;
  userRepository: UserRepository;
};

export async function reactivatePartnerPrincipal(
  deps: ReactivatePartnerPrincipalDeps,
  tenantId: string,
  integrationId: string,
  actorId: string,
): Promise<PartnerPrincipal | null> {
  const normalized = integrationId.trim();
  if (!isUuid(normalized)) {
    throw new ValidationError("partner_integration_id_invalid");
  }

  const grantActorId = await resolveGrantActorIdForTenant(
    deps.userRepository,
    tenantId,
    actorId,
  );

  return deps.partnerPrincipalRepository.reactivateByIntegrationId(
    tenantId,
    normalized,
    grantActorId,
  );
}
