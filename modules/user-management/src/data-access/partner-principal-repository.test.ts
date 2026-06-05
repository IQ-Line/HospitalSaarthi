import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryPartnerPrincipalRepository } from "./in-memory-partner-principal-repository.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INTEGRATION_ID = randomUUID();
const CAP_A = randomUUID();
const CAP_B = randomUUID();
const CAP_C = randomUUID();

describe("InMemoryPartnerPrincipalRepository lifecycle", () => {
  it("provisions idempotently and replaces system capability grants", async () => {
    const repo = new InMemoryPartnerPrincipalRepository();

    const first = await repo.provisionPartnerPrincipal(TENANT, {
      integrationId: INTEGRATION_ID,
      displayName: "Smart Report",
      capabilityIds: [CAP_A, CAP_B],
      actorId: null,
    });

    const second = await repo.provisionPartnerPrincipal(TENANT, {
      integrationId: INTEGRATION_ID,
      displayName: "Smart Report v2",
      capabilityIds: [CAP_B, CAP_C],
      actorId: null,
    });

    expect(second.id).toBe(first.id);
    expect(second.full_name).toBe("Smart Report v2");

    const active = repo
      .listSystemGrants(TENANT, first.id)
      .filter((grant) => grant.revokedAt === null)
      .map((grant) => grant.capabilityId)
      .sort();
    expect(active).toEqual([CAP_B, CAP_C].sort());
  });

  it("does not restore capability grants removed before deactivate when reactivating", async () => {
    const repo = new InMemoryPartnerPrincipalRepository();

    const partner = await repo.provisionPartnerPrincipal(TENANT, {
      integrationId: INTEGRATION_ID,
      displayName: "Partner",
      capabilityIds: [CAP_A, CAP_B],
      actorId: null,
    });

    await repo.provisionPartnerPrincipal(TENANT, {
      integrationId: INTEGRATION_ID,
      displayName: "Partner",
      capabilityIds: [CAP_A],
      actorId: null,
    });

    await repo.deactivateByIntegrationId(TENANT, INTEGRATION_ID, null);
    await repo.reactivateByIntegrationId(TENANT, INTEGRATION_ID, null);

    const active = repo
      .listSystemGrants(TENANT, partner.id)
      .filter((grant) => grant.revokedAt === null)
      .map((grant) => grant.capabilityId);
    expect(active).toEqual([CAP_A]);
  });

  it("deactivate and reactivate round-trip restores only the active grant set at deactivate time", async () => {
    const repo = new InMemoryPartnerPrincipalRepository();

    const partner = await repo.provisionPartnerPrincipal(TENANT, {
      integrationId: INTEGRATION_ID,
      displayName: "Partner",
      capabilityIds: [CAP_A, CAP_B],
      actorId: null,
    });

    const deactivated = await repo.deactivateByIntegrationId(TENANT, INTEGRATION_ID, null);
    expect(deactivated?.status).toBe("inactive");

    const reactivated = await repo.reactivateByIntegrationId(TENANT, INTEGRATION_ID, null);
    expect(reactivated?.status).toBe("active");

    const active = repo
      .listSystemGrants(TENANT, partner.id)
      .filter((grant) => grant.revokedAt === null)
      .map((grant) => grant.capabilityId)
      .sort();
    expect(active).toEqual([CAP_A, CAP_B].sort());
  });
});
