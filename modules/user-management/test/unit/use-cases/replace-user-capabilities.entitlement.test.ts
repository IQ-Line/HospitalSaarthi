import { describe, expect, it, vi } from "vitest";
import { ModuleEntitlementLookupError } from "../../../src/domain/errors.js";
import { InMemoryCapabilityRepository } from "../../../src/data-access/in-memory-capability-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import type { Capability } from "../../../src/ports/index.js";
import { createMasterDataModuleCatalogPortStub } from "../../../src/test-support/master-data-catalog-port-stub.js";
import { replaceUserCapabilities } from "../../../src/use-cases/replace-user-capabilities.js";

const TENANT = "tenant-a";
const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d670";
const CAP_UM = "f47ac10b-58cc-4372-a567-0e02b2c3d671";
const CAP_OPD = "f47ac10b-58cc-4372-a567-0e02b2c3d672";

const CAP_UM_ROW: Capability = {
  id: CAP_UM,
  capability_key: "users:users:read",
  module: "users",
  feature: "users",
  action: "read",
  display_name: "Read users",
  is_active: true,
  source_catalog: "master_data",
  source_module_slug: "users",
  source_permission_slug: "read",
};

const CAP_OPD_ROW: Capability = {
  id: CAP_OPD,
  capability_key: "opd:visit:read",
  module: "opd",
  feature: "visit",
  action: "read",
  display_name: "Read visits",
  is_active: true,
};

function buildDeps(entitlement: {
  moduleIds?: string[];
  slugs?: Map<string, string>;
  configuratorError?: Error;
}) {
  const userRepository = new InMemoryUserRepository();
  userRepository.insertUserWithId(TENANT, USER_ID, { full_name: "U", email: "u@example.com" });

  return {
    userRepository,
    capabilityRepository: new InMemoryCapabilityRepository([
      { capability: CAP_UM_ROW },
      { capability: CAP_OPD_ROW },
    ]),
    userAccessRepository: new InMemoryUserAccessRepository(async () => null),
    tenantModuleEntitlementPort: {
      listTenantEnabledModuleIds: entitlement.configuratorError
        ? vi.fn().mockRejectedValue(entitlement.configuratorError)
        : vi.fn().mockResolvedValue(entitlement.moduleIds ?? []),
    },
    masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
      resolveModuleSlugsByIds: vi.fn().mockResolvedValue(entitlement.slugs ?? new Map()),
    }),
  };
}

describe("replaceUserCapabilities entitlement", () => {
  it("rejects non-entitled capability ids (fail closed)", async () => {
    const deps = buildDeps({});
    await expect(
      replaceUserCapabilities(
        deps,
        { tenantId: TENANT, actorId: "actor-1", correlationId: "c" },
        USER_ID,
        { grant_overrides: [{ capability_id: CAP_OPD }], deny_overrides: [] },
      ),
    ).rejects.toMatchObject({ code: "CAPABILITY_NOT_ENTITLED_FOR_TENANT" });
  });

  it("fails closed when Configurator is unavailable (no partial persist)", async () => {
    const deps = buildDeps({
      configuratorError: new ModuleEntitlementLookupError("configurator"),
    });
    const spy = vi.spyOn(deps.userAccessRepository, "replaceCapabilityOverrides");

    await expect(
      replaceUserCapabilities(
        deps,
        { tenantId: TENANT, actorId: "actor-1", correlationId: "c" },
        USER_ID,
        { grant_overrides: [{ capability_id: CAP_UM }], deny_overrides: [] },
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);

    expect(spy).not.toHaveBeenCalled();
  });
});
