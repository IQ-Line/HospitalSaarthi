import { randomUUID } from "node:crypto";
import { UnexpectedPersistenceError } from "../domain/errors.js";
import type { PartnerPrincipal } from "../domain/types.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";

type StoredPartner = {
  tenantId: string;
  id: string;
  integrationId: string;
  fullName: string;
  status: PartnerPrincipal["status"];
  deactivatedAt: Date | null;
  /** Grant map keys revoked during the latest deactivate (scoped restore on reactivate). */
  deactivatedGrantKeys: string[];
};

type StoredGrant = {
  tenantId: string;
  userId: string;
  capabilityId: string;
  grantSource: "system";
  revokedAt: Date | null;
};

function partnerKey(tenantId: string, integrationId: string): string {
  return `${tenantId}:${integrationId}`;
}

function grantKey(tenantId: string, userId: string, capabilityId: string): string {
  return `${tenantId}:${userId}:${capabilityId}`;
}

function toPartnerPrincipal(row: StoredPartner): PartnerPrincipal {
  return {
    id: row.id,
    full_name: row.fullName,
    kind: "partner",
    integration_id: row.integrationId,
    status: row.status,
  };
}

/**
 * In-memory partner principal repository for unit tests.
 * Mirrors production grant lifecycle semantics (provision replace, deactivate marker, scoped restore).
 */
export class InMemoryPartnerPrincipalRepository implements PartnerPrincipalRepository {
  private readonly partners = new Map<string, StoredPartner>();
  private readonly grants = new Map<string, StoredGrant>();

  listSystemGrants(tenantId: string, userId: string): StoredGrant[] {
    return [...this.grants.values()].filter(
      (grant) =>
        grant.tenantId === tenantId &&
        grant.userId === userId &&
        grant.grantSource === "system",
    );
  }

  async findByIntegrationId(
    tenantId: string,
    integrationId: string,
  ): Promise<PartnerPrincipal | null> {
    const row = this.partners.get(partnerKey(tenantId, integrationId));
    return row ? toPartnerPrincipal(row) : null;
  }

  async provisionPartnerPrincipal(
    tenantId: string,
    input: {
      integrationId: string;
      displayName: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<PartnerPrincipal> {
    const key = partnerKey(tenantId, input.integrationId);
    const desiredIds = [...new Set(input.capabilityIds)];
    const existing = this.partners.get(key);

    const userId = existing?.id ?? randomUUID();
    for (const grant of this.listSystemGrants(tenantId, userId)) {
      if (grant.revokedAt === null && !desiredIds.includes(grant.capabilityId)) {
        grant.revokedAt = new Date();
      }
    }

    for (const capabilityId of desiredIds) {
      const gKey = grantKey(tenantId, userId, capabilityId);
      const existingGrant = this.grants.get(gKey);
      if (existingGrant) {
        existingGrant.revokedAt = null;
      } else {
        this.grants.set(gKey, {
          tenantId,
          userId,
          capabilityId,
          grantSource: "system",
          revokedAt: null,
        });
      }
    }

    const partner: StoredPartner = {
      tenantId,
      id: userId,
      integrationId: input.integrationId,
      fullName: input.displayName,
      status: "active",
      deactivatedAt: null,
      deactivatedGrantKeys: [],
    };
    this.partners.set(key, partner);
    return toPartnerPrincipal(partner);
  }

  async deactivateByIntegrationId(
    tenantId: string,
    integrationId: string,
    _actorId: string | null,
  ): Promise<PartnerPrincipal | null> {
    const key = partnerKey(tenantId, integrationId);
    const existing = this.partners.get(key);
    if (!existing) {
      return null;
    }

    const deactivatedAt = new Date();
    const deactivatedGrantKeys: string[] = [];
    for (const grant of this.listSystemGrants(tenantId, existing.id)) {
      if (grant.revokedAt === null) {
        grant.revokedAt = deactivatedAt;
        deactivatedGrantKeys.push(
          grantKey(tenantId, existing.id, grant.capabilityId),
        );
      }
    }

    existing.status = "inactive";
    existing.deactivatedAt = deactivatedAt;
    existing.deactivatedGrantKeys = deactivatedGrantKeys;
    return toPartnerPrincipal(existing);
  }

  async reactivateByIntegrationId(
    tenantId: string,
    integrationId: string,
    _actorId: string | null,
  ): Promise<PartnerPrincipal | null> {
    const key = partnerKey(tenantId, integrationId);
    const existing = this.partners.get(key);
    if (!existing) {
      return null;
    }

    if (existing.deactivatedAt === null) {
      if (existing.status === "active") {
        return toPartnerPrincipal(existing);
      }
      throw new UnexpectedPersistenceError({
        cause: new Error("Inactive partner principal is missing deactivated_at marker"),
      });
    }

    for (const key of existing.deactivatedGrantKeys) {
      const grant = this.grants.get(key);
      if (grant) {
        grant.revokedAt = null;
      }
    }

    existing.status = "active";
    existing.deactivatedAt = null;
    existing.deactivatedGrantKeys = [];
    return toPartnerPrincipal(existing);
  }
}
