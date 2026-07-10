import { describe, expect, it, vi } from "vitest";
import { ModuleEntitlementLookupError } from "../../../src/domain/errors.js";
import { InMemoryCapabilityRepository } from "../../../src/data-access/in-memory-capability-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../../../src/data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import type { Capability, Role } from "../../../src/ports/index.js";
import { createMasterDataModuleCatalogPortStub } from "../../../src/test-support/master-data-catalog-port-stub.js";
import { applyRoleTemplate } from "../../../src/use-cases/apply-role-template.js";

const TENANT = "tenant-a";
const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d650";
const ROLE_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d651";
const CAP_UM = "f47ac10b-58cc-4372-a567-0e02b2c3d661";
const CAP_EMP = "f47ac10b-58cc-4372-a567-0e02b2c3d662";

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

const CAP_EMP_ROW: Capability = {
  id: CAP_EMP,
  capability_key: "empi:patient:read",
  module: "empi",
  feature: "patient",
  action: "read",
  display_name: "Read patient",
  is_active: true,
  source_catalog: "master_data",
  source_module_slug: "empi",
  source_permission_slug: "read",
};

function buildDeps(entitlement: { moduleIds?: string[]; slugs?: Map<string, string> }) {
  const userRepository = new InMemoryUserRepository();
  const roleRepository = new InMemoryRoleRepository([
    {
      tenantId: TENANT,
      role: {
        id: ROLE_ID,
        code: "clerk",
        role_type: "clerk",
        display_name: "Clerk",
        is_system: false,
        status: "active",
      } satisfies Role,
    },
  ]);
  const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
    roleRepository.getRoleById(tenantId, roleId),
  );
  const capabilityRepository = new InMemoryCapabilityRepository([
    { capability: CAP_UM_ROW },
    { capability: CAP_EMP_ROW },
  ]);
  const roleCapabilityRepository = new InMemoryRoleCapabilityRepository(
    [
      {
        tenantId: TENANT,
        roleId: ROLE_ID,
        capabilities: [CAP_UM_ROW, CAP_EMP_ROW],
      },
    ],
    [CAP_UM_ROW, CAP_EMP_ROW],
  );
  const principalRoleProjectionRepository = new InMemoryPrincipalRoleProjectionRepository(
    userAccessRepository,
    roleRepository,
  );

  return {
    userRepository,
    roleRepository,
    roleCapabilityRepository,
    userAccessRepository,
    principalRoleProjectionRepository,
    capabilityRepository,
    tenantModuleEntitlementPort: {
      listTenantEnabledModuleIds: vi.fn().mockResolvedValue(entitlement.moduleIds ?? []),
    },
    masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
      resolveModuleSlugsByIds: vi.fn().mockResolvedValue(entitlement.slugs ?? new Map()),
    }),
  };
}

describe("applyRoleTemplate entitlement", () => {
  it("rejects EMPI capability when tenant is not entitled to empi module", async () => {
    const deps = buildDeps({});
    deps.userRepository.insertUserWithId(TENANT, USER_ID, {
      full_name: "U",
      email: "u@example.com",
    });

    await expect(
      applyRoleTemplate(
        deps,
        { tenantId: TENANT, actorId: null, correlationId: "c" },
        { user_id: USER_ID, role_id: ROLE_ID },
      ),
    ).rejects.toMatchObject({
      code: "CAPABILITY_NOT_ENTITLED_FOR_TENANT",
      capabilityId: CAP_EMP,
    });
  });

  it("allows when tenant module map includes empi slug", async () => {
    const empiModuleId = "33333333-3333-4333-8333-333333333333";
    const deps = buildDeps({
      moduleIds: [empiModuleId],
      slugs: new Map([[empiModuleId, "empi"]]),
    });
    deps.userRepository.insertUserWithId(TENANT, USER_ID, {
      full_name: "U",
      email: "u@example.com",
    });

    await expect(
      applyRoleTemplate(
        deps,
        { tenantId: TENANT, actorId: null, correlationId: "c" },
        { user_id: USER_ID, role_id: ROLE_ID },
      ),
    ).resolves.toEqual(expect.objectContaining({ user_id: USER_ID, role_id: ROLE_ID }));
  });

  it("fails closed when Configurator errors before persisting template", async () => {
    const deps = buildDeps({});
    deps.userRepository.insertUserWithId(TENANT, USER_ID, {
      full_name: "U",
      email: "u@example.com",
    });
    vi.mocked(deps.tenantModuleEntitlementPort.listTenantEnabledModuleIds).mockRejectedValue(
      new ModuleEntitlementLookupError("configurator"),
    );

    await expect(
      applyRoleTemplate(
        deps,
        { tenantId: TENANT, actorId: null, correlationId: "c" },
        { user_id: USER_ID, role_id: ROLE_ID, role_template_capability_ids: [CAP_UM] },
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);

    await expect(deps.userAccessRepository.listRoleTemplatesByUser(TENANT, USER_ID)).resolves.toHaveLength(
      0,
    );
  });
});
