import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CapabilityNotFoundError, ValidationError } from "../domain/errors.js";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import type { Capability, PartnerPrincipal } from "../ports/index.js";
import { createMasterDataModuleCatalogPortStub } from "../test-support/master-data-catalog-port-stub.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";
import { provisionPartnerPrincipal } from "./provision-partner-principal.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INTEGRATION_ID = randomUUID();
const CAP_ID = randomUUID();

const MODULE_ID = randomUUID();

const CAP_ROW: Capability = {
  id: CAP_ID,
  capability_key: "integration:integration:read",
  module: "integration",
  feature: "integration",
  action: "read",
  display_name: "Read integrations",
  is_active: true,
  source_module_slug: "integration",
  source_permission_slug: "read",
  source_catalog: "master_data",
};

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
          capabilityRepository: new InMemoryCapabilityRepository([{ capability: CAP_ROW }]),
          tenantModuleEntitlementPort: {
            listTenantEnabledModuleIds: vi.fn().mockResolvedValue([]),
          },
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
        },
        { tenantId: TENANT, actorId: randomUUID() },
        {
          integration_id: "not-a-uuid",
          integration_display_name: "Partner",
          suggested_capability_keys: ["integration:integration:read"],
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects empty suggested_capability_keys", async () => {
    await expect(
      provisionPartnerPrincipal(
        {
          partnerPrincipalRepository: buildPartnerRepo(),
          capabilityRepository: new InMemoryCapabilityRepository([{ capability: CAP_ROW }]),
          tenantModuleEntitlementPort: {
            listTenantEnabledModuleIds: vi.fn().mockResolvedValue([]),
          },
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
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

  it("provisions partner with entitled capability keys", async () => {
    const partnerPrincipalRepository = buildPartnerRepo();
    const slugs = new Map([[MODULE_ID, "integration"]]);

    const result = await provisionPartnerPrincipal(
      {
        partnerPrincipalRepository,
        capabilityRepository: new InMemoryCapabilityRepository([{ capability: CAP_ROW }]),
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([MODULE_ID]),
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: vi.fn().mockResolvedValue(slugs),
        }),
      },
      { tenantId: TENANT, actorId: randomUUID() },
      {
        integration_id: INTEGRATION_ID,
        integration_display_name: "Smart Report",
        suggested_capability_keys: ["integration:integration:read"],
      },
    );

    expect(result.kind).toBe("partner");
    expect(partnerPrincipalRepository.provisionPartnerPrincipal).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        integrationId: INTEGRATION_ID,
        displayName: "Smart Report",
        capabilityIds: [CAP_ID],
      }),
    );
  });

  it("fails when capability key is unknown", async () => {
    await expect(
      provisionPartnerPrincipal(
        {
          partnerPrincipalRepository: buildPartnerRepo(),
          capabilityRepository: new InMemoryCapabilityRepository([{ capability: CAP_ROW }]),
          tenantModuleEntitlementPort: {
            listTenantEnabledModuleIds: vi.fn().mockResolvedValue([]),
          },
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
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
