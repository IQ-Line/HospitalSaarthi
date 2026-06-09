import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PartnerOrchestrationCapabilityKeyError } from "../domain/partner-orchestration-capability-keys.js";
import { CapabilityNotFoundError } from "../domain/errors.js";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import type { Capability } from "../ports/index.js";
import { assertPartnerOrchestrationCapabilityKeys } from "./assert-partner-orchestration-capability-keys.js";

const REG_CAP_ID = randomUUID();
const EMPI_CAP_ID = randomUUID();

const REG_CAP: Capability = {
  id: REG_CAP_ID,
  capability_key: "registration:registration:read",
  module: "registration",
  feature: "registration",
  action: "read",
  display_name: "Read registrations",
  is_active: true,
  source_module_slug: "registration",
  source_permission_slug: "read",
  source_catalog: "master_data",
};

const EMPI_CAP: Capability = {
  id: EMPI_CAP_ID,
  capability_key: "empi:patient:read",
  module: "empi",
  feature: "patient",
  action: "read",
  display_name: "Read patients",
  is_active: true,
  source_module_slug: "empi",
  source_permission_slug: "empi.patient.read",
  source_catalog: "master_data",
};

describe("assertPartnerOrchestrationCapabilityKeys", () => {
  it("resolves partner-exposed keys without tenant module entitlement", async () => {
    const ids = await assertPartnerOrchestrationCapabilityKeys(
      {
        capabilityRepository: new InMemoryCapabilityRepository([
          { capability: REG_CAP },
          { capability: EMPI_CAP },
        ]),
      },
      ["registration:registration:read", "empi:patient:read"],
    );

    expect(ids).toEqual(expect.arrayContaining([REG_CAP_ID, EMPI_CAP_ID]));
    expect(ids).toHaveLength(2);
  });

  it("rejects keys outside the orchestration allowlist", async () => {
    await expect(
      assertPartnerOrchestrationCapabilityKeys(
        {
          capabilityRepository: new InMemoryCapabilityRepository([{ capability: REG_CAP }]),
        },
        ["integration:integration:read"],
      ),
    ).rejects.toBeInstanceOf(PartnerOrchestrationCapabilityKeyError);
  });

  it("fails when catalog row is missing", async () => {
    await expect(
      assertPartnerOrchestrationCapabilityKeys(
        { capabilityRepository: new InMemoryCapabilityRepository([]) },
        ["empi:patient:read"],
      ),
    ).rejects.toBeInstanceOf(CapabilityNotFoundError);
  });
});
