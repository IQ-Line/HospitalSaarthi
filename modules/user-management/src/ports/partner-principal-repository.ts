import type { User } from "./index.js";

export type ProvisionPartnerPrincipalInput = {
  integrationId: string;
  integrationDisplayName: string;
  capabilityIds: string[];
  actorId: string | null;
};

export interface PartnerPrincipalRepository {
  findByIntegrationId(tenantId: string, integrationId: string): Promise<User | null>;
  provisionPartnerPrincipal(
    tenantId: string,
    input: ProvisionPartnerPrincipalInput,
  ): Promise<User>;
  reactivatePartnerPrincipal(tenantId: string, integrationId: string): Promise<User | null>;
}
