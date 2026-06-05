import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import { InMemoryPartnerPrincipalRepository } from "../data-access/in-memory-partner-principal-repository.js";
import {
  CapabilityNotFoundError,
  PartnerPrincipalAlreadyExistsError,
} from "../domain/errors.js";
import { provisionPartnerPrincipal } from "./provision-partner-principal.js";

const empiReadCapability = {
  id: randomUUID(),
  capability_key: "empi:patient:read",
  module: "empi",
  feature: "patient",
  action: "read",
  display_name: "Read patients",
  is_active: true,
} as const;

describe("provisionPartnerPrincipal", () => {
  it("creates partner principal with resolved capabilities", async () => {
    const capabilityRepository = new InMemoryCapabilityRepository([
      { capability: { ...empiReadCapability } },
    ]);

    const partnerPrincipalRepository = new InMemoryPartnerPrincipalRepository();
    const integrationId = randomUUID();

    const user = await provisionPartnerPrincipal(
      { partnerPrincipalRepository, capabilityRepository },
      { tenantId: "tenant-a", actorId: "actor-1" },
      {
        integrationId,
        integrationDisplayName: "Smart Report",
        capabilityKeys: [empiReadCapability.capability_key],
      },
    );

    expect(user.full_name).toBe("Smart Report");
    expect(user.status).toBe("active");
  });

  it("rejects duplicate integration principal", async () => {
    const capabilityRepository = new InMemoryCapabilityRepository([
      { capability: { ...empiReadCapability } },
    ]);
    const partnerPrincipalRepository = new InMemoryPartnerPrincipalRepository();
    const integrationId = randomUUID();
    const deps = { partnerPrincipalRepository, capabilityRepository };
    const ctx = { tenantId: "tenant-a", actorId: null };

    await provisionPartnerPrincipal(deps, ctx, {
      integrationId,
      integrationDisplayName: "Smart Report",
      capabilityKeys: [empiReadCapability.capability_key],
    });

    await expect(
      provisionPartnerPrincipal(deps, ctx, {
        integrationId,
        integrationDisplayName: "Smart Report 2",
        capabilityKeys: [empiReadCapability.capability_key],
      }),
    ).rejects.toBeInstanceOf(PartnerPrincipalAlreadyExistsError);
  });

  it("rejects unknown capability keys", async () => {
    await expect(
      provisionPartnerPrincipal(
        {
          partnerPrincipalRepository: new InMemoryPartnerPrincipalRepository(),
          capabilityRepository: new InMemoryCapabilityRepository(),
        },
        { tenantId: "tenant-a", actorId: null },
        {
          integrationId: randomUUID(),
          integrationDisplayName: "Smart Report",
          capabilityKeys: ["missing:cap:read"],
        },
      ),
    ).rejects.toBeInstanceOf(CapabilityNotFoundError);
  });
});
