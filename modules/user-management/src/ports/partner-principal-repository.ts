import type { PartnerPrincipal } from "../domain/types.js";

export interface PartnerPrincipalRepository {
  findByIntegrationId(tenantId: string, integrationId: string): Promise<PartnerPrincipal | null>;

  provisionPartnerPrincipal(
    tenantId: string,
    input: {
      integrationId: string;
      displayName: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<PartnerPrincipal>;

  deactivateByIntegrationId(
    tenantId: string,
    integrationId: string,
    actorId: string | null,
  ): Promise<PartnerPrincipal | null>;

  reactivateByIntegrationId(
    tenantId: string,
    integrationId: string,
    actorId: string | null,
  ): Promise<PartnerPrincipal | null>;
}
