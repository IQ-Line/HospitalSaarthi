import { randomUUID } from "node:crypto";
import type { PartnerPrincipalRepository, ProvisionPartnerPrincipalInput } from "../ports/partner-principal-repository.js";
import type { User } from "../ports/index.js";

type StoredPartner = User & { integration_id: string; kind: "partner" };

export class InMemoryPartnerPrincipalRepository implements PartnerPrincipalRepository {
  private readonly byIntegration = new Map<string, StoredPartner>();

  private key(tenantId: string, integrationId: string): string {
    return `${tenantId}:${integrationId}`;
  }

  async findByIntegrationId(tenantId: string, integrationId: string): Promise<User | null> {
    return this.byIntegration.get(this.key(tenantId, integrationId)) ?? null;
  }

  async provisionPartnerPrincipal(
    tenantId: string,
    input: ProvisionPartnerPrincipalInput,
  ): Promise<User> {
    const user: StoredPartner = {
      id: randomUUID(),
      full_name: input.integrationDisplayName,
      status: "active",
      kind: "partner",
      integration_id: input.integrationId,
    };
    this.byIntegration.set(this.key(tenantId, input.integrationId), user);
    return user;
  }

  async reactivatePartnerPrincipal(
    tenantId: string,
    integrationId: string,
  ): Promise<User | null> {
    const existing = this.byIntegration.get(this.key(tenantId, integrationId));
    if (!existing) return null;
    existing.status = "active";
    return existing;
  }
}
