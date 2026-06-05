import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";
import type { User } from "../ports/index.js";

export type ReactivatePartnerPrincipalContext = {
  tenantId: string;
};

export type ReactivatePartnerPrincipalDeps = {
  partnerPrincipalRepository: PartnerPrincipalRepository;
};

/**
 * Reactivates the partner principal for an integration (idempotent).
 */
export async function reactivatePartnerPrincipal(
  deps: ReactivatePartnerPrincipalDeps,
  ctx: ReactivatePartnerPrincipalContext,
  integrationId: string,
): Promise<User | null> {
  return deps.partnerPrincipalRepository.reactivatePartnerPrincipal(ctx.tenantId, integrationId);
}
