import { describe, expect, it, vi } from "vitest";

import {

  CapabilityNotEntitledForTenantError,

  ModuleEntitlementLookupError,

} from "../domain/errors.js";

import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";

import { InMemoryRoleCapabilityRepository } from "../data-access/in-memory-role-capability-repository.js";

import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";

import type { Capability, Role } from "../ports/index.js";

import { createMasterDataModuleCatalogPortStub } from "../test-support/master-data-catalog-port-stub.js";
import { replaceRoleCapabilities } from "./replace-role-capabilities.js";



const TENANT = "tenant-a";

const ROLE_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d601";

const CAP_UM = "f47ac10b-58cc-4372-a567-0e02b2c3d611";

const CAP_OPD = "f47ac10b-58cc-4372-a567-0e02b2c3d612";



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

  source_catalog: "master_data",

  source_module_slug: "opd",

  source_permission_slug: "visit.read",

};



function buildDeps(

  roleCapabilityRepository: InMemoryRoleCapabilityRepository,

  entitlement: {

    moduleIds?: string[];

    slugs?: Map<string, string>;

    configuratorError?: Error;

  },

) {

  const roleRepository = new InMemoryRoleRepository([

    {

      tenantId: TENANT,

      role: {

        id: ROLE_ID,

        code: "registrar",

        display_name: "Registrar",

        is_system: false,

        status: "active",

      } satisfies Role,

    },

  ]);

  const capabilityRepository = new InMemoryCapabilityRepository([

    { capability: CAP_UM_ROW },

    { capability: CAP_OPD_ROW },

  ]);



  return {

    roleRepository,

    capabilityRepository,

    roleCapabilityRepository,

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



describe("replaceRoleCapabilities entitlement", () => {

  it("rejects OPD capability when OPD is not tenant-enabled", async () => {

    const roleCapabilityRepository = new InMemoryRoleCapabilityRepository([], [CAP_UM_ROW, CAP_OPD_ROW]);

    const deps = buildDeps(roleCapabilityRepository, {});



    await expect(

      replaceRoleCapabilities(deps, TENANT, ROLE_ID, { capability_ids: [CAP_OPD] }),

    ).rejects.toMatchObject({

      code: "CAPABILITY_NOT_ENTITLED_FOR_TENANT",

      capabilityId: CAP_OPD,

    });

  });



  it("allows user-management capability when only platform modules are enabled", async () => {

    const roleCapabilityRepository = new InMemoryRoleCapabilityRepository([], [CAP_UM_ROW, CAP_OPD_ROW]);

    const deps = buildDeps(roleCapabilityRepository, {});



    const result = await replaceRoleCapabilities(deps, TENANT, ROLE_ID, {

      capability_ids: [CAP_UM],

    });



    expect(result).toEqual([CAP_UM_ROW]);

    const stored = await roleCapabilityRepository.listCapabilitiesByRole(TENANT, ROLE_ID);

    expect(stored.map((c) => c.id)).toEqual([CAP_UM]);

  });



  it("allows opd capability when opd module is enabled for tenant", async () => {

    const opdModuleId = "22222222-2222-4222-8222-222222222222";

    const roleCapabilityRepository = new InMemoryRoleCapabilityRepository([], [CAP_UM_ROW, CAP_OPD_ROW]);

    const deps = buildDeps(roleCapabilityRepository, {

      moduleIds: [opdModuleId],

      slugs: new Map([[opdModuleId, "opd"]]),

    });



    const result = await replaceRoleCapabilities(deps, TENANT, ROLE_ID, {

      capability_ids: [CAP_OPD],

    });



    expect(result).toEqual([CAP_OPD_ROW]);

  });



  it("fails closed when Configurator is unavailable", async () => {

    const roleCapabilityRepository = new InMemoryRoleCapabilityRepository([], [CAP_UM_ROW, CAP_OPD_ROW]);

    const deps = buildDeps(roleCapabilityRepository, {

      configuratorError: new ModuleEntitlementLookupError("configurator"),

    });



    await expect(

      replaceRoleCapabilities(deps, TENANT, ROLE_ID, { capability_ids: [CAP_UM] }),

    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);

  });

});

