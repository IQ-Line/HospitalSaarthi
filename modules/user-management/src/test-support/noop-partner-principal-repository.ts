import type { PartnerPrincipal } from "../domain/types.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";

export class NoopPartnerPrincipalRepository implements PartnerPrincipalRepository {
  async findByIntegrationId(): Promise<PartnerPrincipal | null> {
    return null;
  }

  async provisionPartnerPrincipal(): Promise<PartnerPrincipal> {
    throw new Error("not implemented");
  }

  async deactivateByIntegrationId(): Promise<PartnerPrincipal | null> {
    return null;
  }

  async reactivateByIntegrationId(): Promise<PartnerPrincipal | null> {
    return null;
  }
}
