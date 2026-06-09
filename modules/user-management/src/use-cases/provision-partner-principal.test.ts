import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PartnerOrchestrationCapabilityKeyError } from "../domain/partner-orchestration-capability-keys.js";
import { CapabilityNotFoundError, ValidationError } from "../domain/errors.js";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import type { Capability, PartnerPrincipal } from "../ports/index.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";
import { provisionPartnerPrincipal } from "./provision-partner-principal.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INTEGRATION_ID = randomUUID();
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

function buildUserRepository(actorInTenant: boolean) {
  return {
    getUserById: vi.fn().mockResolvedValue(actorInTenant ? { id: "actor-1" } : null),
  };
}

function buildPartnerRepo(): PartnerPrincipalRepository {
  return {
    findByIntegrationId: vi.fn(),
    provisionPartnerPrincipal: vi.fn().mockResolvedValue({
      id: randomUUID(),
      full_name: "Smart Report",
      kind: "partner",
      integration_id: INTEGRATION_ID,
      status: "active",
    } satisfies PartnerPrincipal),
    deactivateByIntegrationId: vi.fn(),
    reactivateByIntegrationId: vi.fn(),
  };
}

describe("provisionPartnerPrincipal", () => {
  it("rejects invalid integration_id", async () => {
    await expect(
      provisionPartnerPrincipal(
        {
          partnerPrincipalRepository: buildPartnerRepo(),
          capabilityRepository: new InMemoryCapabilityRepository([{ capability: REG_CAP }]),
          userRepository: buildUserRepository(false),
        },
        { tenantId: TENANT, actorId: randomUUID() },
        {
          integration_id: "not-a-uuid",
          integration_display_name: "Partner",
          suggested_capability_keys: ["registration:registration:read"],
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects empty suggested_capability_keys", async () => {
    await expect(
      provisionPartnerPrincipal(
        {
          partnerPrincipalRepository: buildPartnerRepo(),
          capabilityRepository: new InMemoryCapabilityRepository([{ capability: REG_CAP }]),
          userRepository: buildUserRepository(false),
        },
        { tenantId: TENANT, actorId: randomUUID() },
        {
          integration_id: INTEGRATION_ID,
          integration_display_name: "Partner",
          suggested_capability_keys: [],
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("provisions partner with smart-report capability keys without tenant module rows", async () => {
    const partnerPrincipalRepository = buildPartnerRepo();
    const actorId = randomUUID();

    const result = await provisionPartnerPrincipal(
      {
        partnerPrincipalRepository,
        capabilityRepository: new InMemoryCapabilityRepository([
          { capability: REG_CAP },
          { capability: EMPI_CAP },
        ]),
        userRepository: buildUserRepository(false),
      },
      { tenantId: TENANT, actorId },
      {
        integration_id: INTEGRATION_ID,
        integration_display_name: "Smart Report",
        suggested_capability_keys: ["registration:registration:read", "empi:patient:read"],
      },
    );

    expect(result.kind).toBe("partner");
    expect(partnerPrincipalRepository.provisionPartnerPrincipal).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        integrationId: INTEGRATION_ID,
        displayName: "Smart Report",
        capabilityIds: expect.arrayContaining([REG_CAP_ID, EMPI_CAP_ID]),
        actorId: null,
      }),
    );
  });

  it("rejects integration admin keys on partner orchestration path", async () => {
    await expect(
      provisionPartnerPrincipal(
        {
          partnerPrincipalRepository: buildPartnerRepo(),
          capabilityRepository: new InMemoryCapabilityRepository([{ capability: REG_CAP }]),
          userRepository: buildUserRepository(false),
        },
        { tenantId: TENANT, actorId: randomUUID() },
        {
          integration_id: INTEGRATION_ID,
          integration_display_name: "Partner",
          suggested_capability_keys: ["integration:integration:read"],
        },
      ),
    ).rejects.toBeInstanceOf(PartnerOrchestrationCapabilityKeyError);
  });

  it("fails when capability key is unknown in catalog", async () => {
    await expect(
      provisionPartnerPrincipal(
        {
          partnerPrincipalRepository: buildPartnerRepo(),
          capabilityRepository: new InMemoryCapabilityRepository([]),
          userRepository: buildUserRepository(false),
        },
        { tenantId: TENANT, actorId: randomUUID() },
        {
          integration_id: INTEGRATION_ID,
          integration_display_name: "Partner",
          suggested_capability_keys: ["empi:patient:read"],
        },
      ),
    ).rejects.toBeInstanceOf(CapabilityNotFoundError);
  });
});
