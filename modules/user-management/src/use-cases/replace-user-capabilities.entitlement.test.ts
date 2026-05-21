import { describe, expect, it, vi } from "vitest";
import { ModuleEntitlementLookupError } from "../domain/errors.js";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import { InMemoryUserAccessRepository } from "../data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import type { Capability } from "../ports/index.js";
import { replaceUserCapabilities } from "./replace-user-capabilities.js";

const TENANT = "tenant-a";
const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d670";
const CAP_UM = "f47ac10b-58cc-4372-a567-0e02b2c3d671";
const CAP_OPD = "f47ac10b-58cc-4372-a567-0e02b2c3d672";

const CAP_UM_ROW: Capability = {
  id: CAP_UM,
  capability_key: "users:users:read",
  module: "user-management",
  feature: "users",
  action: "read",
  display_name: "Read users",
  is_active: true,
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
    masterDataModuleCatalogPort: {
      resolveModuleSlugsByIds: vi.fn().mockResolvedValue(entitlement.slugs ?? new Map()),
      expandEnabledModuleSlugs: vi.fn(async (slugs: readonly string[]) => slugs),
    },
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
        { capability_ids: [CAP_OPD] },
      ),
    ).rejects.toMatchObject({ code: "CAPABILITY_NOT_ENTITLED_FOR_TENANT" });
  });

  it("fails closed when Configurator is unavailable (no partial persist)", async () => {
    const deps = buildDeps({
      configuratorError: new ModuleEntitlementLookupError("configurator"),
    });
    const spy = vi.spyOn(deps.userAccessRepository, "replaceManualCapabilityGrants");

    await expect(
      replaceUserCapabilities(
        deps,
        { tenantId: TENANT, actorId: "actor-1", correlationId: "c" },
        USER_ID,
        { capability_ids: [CAP_UM] },
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);

    expect(spy).not.toHaveBeenCalled();
  });
});
