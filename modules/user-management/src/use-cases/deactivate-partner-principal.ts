import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";
import type { User, UserRepository } from "../ports/index.js";
import { deactivateUser } from "./deactivate-user.js";
import type { DeactivateUserDeps } from "./deactivate-user.js";

export type DeactivatePartnerPrincipalContext = {
  tenantId: string;
  actorId: string;
};

export type DeactivatePartnerPrincipalDeps = DeactivateUserDeps & {
  partnerPrincipalRepository: PartnerPrincipalRepository;
};

/**
 * Deactivates the partner principal for an integration (idempotent).
 */
export async function deactivatePartnerPrincipal(
  deps: DeactivatePartnerPrincipalDeps,
  ctx: DeactivatePartnerPrincipalContext,
  integrationId: string,
): Promise<User | null> {
  const partner = await deps.partnerPrincipalRepository.findByIntegrationId(
    ctx.tenantId,
    integrationId,
  );
  if (partner === null) {
    return null;
  }
  if (partner.status === "inactive") {
    return partner;
  }
  return deactivateUser(
    { userRepository: deps.userRepository, eventBus: deps.eventBus },
    { tenantId: ctx.tenantId, userId: ctx.actorId },
    partner.id,
  );
}
