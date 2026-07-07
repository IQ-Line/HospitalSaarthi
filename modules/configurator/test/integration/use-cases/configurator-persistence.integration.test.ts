import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createDb,
  createPool,
  type DbInstance,
} from "@hims/ts-sdk-db";
import type { DomainEvent, EventBus } from "@hims/ts-sdk-events";
import { applyConfiguratorSchemaMigration } from "../../../src/schema/apply-migration.js";
import { DrizzleOrganizationRepo } from "../../../src/data-access/organization.repo.js";
import { DrizzleTenantRepo } from "../../../src/data-access/tenant.repo.js";
import { DrizzleTenantModuleRepo } from "../../../src/data-access/tenant-module.repo.js";
import { DrizzleTenantIntegrationProfilesRepo } from "../../../src/data-access/tenant-integration-profile.repo.js";
import {
  provisionTenant,
  type ProvisionTenantContext,
  type ProvisionTenantDeps,
  TENANT_ONBOARDING_COMPLETED_EVENT,
} from "../../../src/use-cases/provision-tenant.js";
import { listEntitlementEnabledModuleIds } from "../../../src/use-cases/list-entitlement-enabled-module-ids.js";
import type {
  PlatformModuleCatalogPort,
  RunConfiguratorTransaction,
  TenantAdminProvisioningPort,
} from "../../../src/ports.js";
import type { ProvisionTenantInput } from "../../../src/domain/onboarding.types.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for the two highest-risk, previously-untested paths
// (vet 2026-06-22, configurator P4). Opt-in: runs ONLY when TEST_DATABASE_URL
// points at a throwaway CITUS instance (e.g. the local `hims-verify` container on
// :5444). It deliberately does NOT key off the app's DATABASE_URL — in local dev
// that points at a plain (non-Citus) Postgres, where create_reference_table would
// error rather than skip. Unset TEST_DATABASE_URL → these suites skip cleanly.
//
//   1. provisionTenant — the onboarding saga. Proves (a) success ordering +
//      committed end state (tenant promoted to 'active', modules persisted,
//      event published) and (b) the documented compensation gap: when the
//      post-commit HTTP step fails, the tenant stays COMMITTED in 'provisioning'
//      (recoverable), not rolled back and not promoted.
//   2. listEntitlementEnabledModuleIds — the tenant_modules SELECT + orphan-deactivate
//      UPDATE against real Citus, with the Master Data catalog injected as a stubbed
//      PlatformModuleCatalogPort (the cross-schema JOIN it used to run is gone — closed by
//      the #52 HTTP-first reach-in fix). Proves the orphan side effect, the returned shape,
//      and the two fail-closed floors (catalog fetch-failure throws; authoritatively-empty
//      catalog throws) never mass-deactivate — a fake repo cannot verify the real SQL / UPDATE.
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

/** Minimal in-memory EventBus that records published events (no S2S dep needed). */
class CapturingEventBus implements EventBus {
  readonly published: DomainEvent[] = [];
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }
  async subscribe(): Promise<{ unsubscribe(): Promise<void> }> {
    return { unsubscribe: async () => {} };
  }
  eventsByType(eventType: string): DomainEvent[] {
    return this.published.filter((e) => e.event_type === eventType);
  }
}

/** In-memory PlatformModuleCatalogPort stub: returns a fixed valid-id set (ignores `fresh`). */
function stubCatalog(validModuleIds: string[]): PlatformModuleCatalogPort {
  const ids = new Set(validModuleIds);
  return { listValidModuleIds: async () => ids };
}

const ACTOR_ID = "00000000-0000-4000-8000-0000000000a0";
const CORRELATION_ID = "00000000-0000-4000-8000-0000000000c0";
const INFRA_MODULE_ID = "10000000-0000-4000-8000-000000000001";
const PRODUCT_MODULE_ID = "10000000-0000-4000-8000-000000000002";

const TRUNCATE_TARGETS = [
  "configurator.tenant_modules",
  "configurator.tenant_integration_profiles",
  "configurator.tenant_api_keys",
  "configurator.sequence_configuration",
  "configurator.tenants",
  "configurator.organizations",
];

describeDb("configurator persistence (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let runConfiguratorTransaction: RunConfiguratorTransaction;

  beforeAll(async () => {
    pool = createPool(url);
    // Clean slate so migrations re-run deterministically against any prior state.
    await pool.query("DROP SCHEMA IF EXISTS configurator CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");

    await applyConfiguratorSchemaMigration(url);

    // Master Data's global module catalog is no longer a cross-schema table here: the entitlement
    // use-case reads it over HTTP via PlatformModuleCatalogPort (D3), which the tests below inject
    // as a stub. Nothing to create.
    db = createDb(url);
    runConfiguratorTransaction = (fn) =>
      db.transaction(async (tx) =>
        fn({
          organizationRepo: new DrizzleOrganizationRepo(tx as DbInstance),
          tenantRepo: new DrizzleTenantRepo(tx as DbInstance),
          tenantModuleRepo: new DrizzleTenantModuleRepo(tx as DbInstance),
        }),
      );
  }, 60_000);

  beforeEach(async () => {
    for (const table of TRUNCATE_TARGETS) {
      await pool.query(`TRUNCATE ${table} CASCADE`);
    }
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS configurator CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  // ---- helpers ------------------------------------------------------------

  function makeInput(): ProvisionTenantInput {
    return {
      organization: {
        name: "Acme Health",
        slug: "acme-health",
        type: "standalone_hospital",
      },
      tenant: { name: "Acme Main", slug: "acme-main" },
      plan: { slug: "starter" },
      modules: [{ module_id: PRODUCT_MODULE_ID, is_active: true }],
      admin: {
        first_name: "Admin",
        last_name: "User",
        username: "admin.user",
        email: null,
        password: "password123",
        phone: null,
      },
    };
  }

  function makeProvisioner(
    calls: string[],
    throwOn?: string,
  ): TenantAdminProvisioningPort {
    const step = async <T>(name: string, value: T): Promise<T> => {
      calls.push(name);
      if (throwOn === name) {
        throw new Error(`UM unavailable at ${name}`);
      }
      return value;
    };
    return {
      createAuthAccount: () => step("createAuthAccount", { authUserId: "auth-1" }),
      createSystemRole: () =>
        step("createSystemRole", {
          id: "role-1",
          code: "tenant-admin",
          display_name: "Tenant Administrator",
          is_system: true,
        }),
      replaceRoleCapabilities: async () => {
        await step("replaceRoleCapabilities", undefined);
      },
      provisionUser: () =>
        step("provisionUser", { id: "user-1", email: null, full_name: "Admin User" }),
    };
  }

  function makeDeps(
    eventBus: CapturingEventBus,
    adminProvisioner: TenantAdminProvisioningPort,
  ): ProvisionTenantDeps {
    return {
      runConfiguratorTransaction,
      infrastructureCatalog: {
        fetchInfrastructureModuleIds: async () => [INFRA_MODULE_ID],
      },
      moduleCapabilityResolver: {
        resolveCapabilityIdsForModules: async () => ["cap-1"],
      },
      adminProvisioner,
      eventBus,
    };
  }

  const ctx: ProvisionTenantContext = {
    actorId: ACTOR_ID,
    correlationId: CORRELATION_ID,
  };

  async function tenantBySlug(slug: string): Promise<{
    iq_tenant_id: string;
    provisioning_status: string;
  } | undefined> {
    const { rows } = await pool.query<{
      iq_tenant_id: string;
      provisioning_status: string;
    }>(
      "SELECT iq_tenant_id, provisioning_status FROM configurator.tenants WHERE slug = $1",
      [slug],
    );
    return rows[0];
  }

  // ---- provisionTenant: success ------------------------------------------

  it("provisionTenant commits org+tenant+modules, promotes to active, publishes once", async () => {
    const calls: string[] = [];
    const eventBus = new CapturingEventBus();
    const deps = makeDeps(eventBus, makeProvisioner(calls));

    const result = await provisionTenant(deps, ctx, makeInput());

    expect(result.provisioning_status).toBe("completed");
    expect(result.tenant.provisioning_status).toBe("active");

    // Auth account is prepared before the DB commit; role/caps/user come after.
    expect(calls).toEqual([
      "createAuthAccount",
      "createSystemRole",
      "replaceRoleCapabilities",
      "provisionUser",
    ]);

    // Committed end state, read straight from Postgres.
    const tenant = await tenantBySlug("acme-main");
    expect(tenant?.provisioning_status).toBe("active");
    expect(tenant?.iq_tenant_id).toBe(result.tenant.iq_tenant_id);

    const orgs = await pool.query(
      "SELECT id FROM configurator.organizations WHERE slug = $1",
      ["acme-health"],
    );
    expect(orgs.rows).toHaveLength(1);

    const mods = await pool.query<{ module_id: string; is_active: boolean; is_core_override: boolean }>(
      "SELECT module_id, is_active, is_core_override FROM configurator.tenant_modules WHERE iq_tenant_id = $1 ORDER BY module_id",
      [result.tenant.iq_tenant_id],
    );
    expect(mods.rows.map((r) => r.module_id).sort()).toEqual(
      [INFRA_MODULE_ID, PRODUCT_MODULE_ID].sort(),
    );
    expect(mods.rows.every((r) => r.is_active)).toBe(true);
    // The infrastructure module is force-enabled as a core override.
    const infra = mods.rows.find((r) => r.module_id === INFRA_MODULE_ID);
    expect(infra?.is_core_override).toBe(true);

    const events = eventBus.eventsByType(TENANT_ONBOARDING_COMPLETED_EVENT);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload["enabled_module_ids"]).toEqual([
      INFRA_MODULE_ID,
      PRODUCT_MODULE_ID,
    ]);
  });

  // ---- provisionTenant: failure after commit (compensation gap) -----------

  it("leaves the tenant COMMITTED in 'provisioning' when the post-commit step fails", async () => {
    const calls: string[] = [];
    const eventBus = new CapturingEventBus();
    const deps = makeDeps(eventBus, makeProvisioner(calls, "createSystemRole"));

    await expect(provisionTenant(deps, ctx, makeInput())).rejects.toThrow(
      "UM unavailable at createSystemRole",
    );

    // Core entities were committed before the failing HTTP step…
    const tenant = await tenantBySlug("acme-main");
    expect(tenant).toBeDefined();
    // …and the tenant is left recoverable in 'provisioning' — NOT rolled back,
    // NOT promoted to active.
    expect(tenant?.provisioning_status).toBe("provisioning");

    const mods = await pool.query(
      "SELECT module_id FROM configurator.tenant_modules WHERE iq_tenant_id = $1",
      [tenant?.iq_tenant_id],
    );
    expect(mods.rows).toHaveLength(2);

    // No completion event on the failure path.
    expect(eventBus.eventsByType(TENANT_ONBOARDING_COMPLETED_EVENT)).toHaveLength(0);
    expect(calls).toEqual(["createAuthAccount", "createSystemRole"]);
  });

  // ---- repo.delete is tenant-scoped at the SQL level (P6) ------------------

  it("integration-profile delete only removes a row within its own tenant", async () => {
    const orgRepo = new DrizzleOrganizationRepo(db);
    const tenantRepo = new DrizzleTenantRepo(db);
    const profileRepo = new DrizzleTenantIntegrationProfilesRepo(db);

    const org = await orgRepo.create({
      name: "Delete Scope Org",
      slug: "delete-scope-org",
      type: "hospital_chain",
      status: "active",
    });
    const tenantA = await tenantRepo.create({
      org_id: org.id,
      name: "Tenant A",
      slug: "tenant-a",
      type: "full_platform",
      cerbos_scope_key: "delete-scope/a",
    });
    const tenantB = await tenantRepo.create({
      org_id: org.id,
      name: "Tenant B",
      slug: "tenant-b",
      type: "full_platform",
      cerbos_scope_key: "delete-scope/b",
    });
    const profile = await profileRepo.create({
      iq_tenant_id: tenantA.iq_tenant_id,
      integration_kind: "abdm",
      hip_id: "HIP-DEL",
      hiu_id: "HIU-DEL",
    });

    // Wrong tenant → the WHERE clause matches nothing; row survives.
    expect(await profileRepo.delete(profile.id, tenantB.iq_tenant_id)).toBe(false);
    expect(await profileRepo.findById(profile.id)).toBeDefined();

    // Owning tenant → deleted.
    expect(await profileRepo.delete(profile.id, tenantA.iq_tenant_id)).toBe(true);
    expect(await profileRepo.findById(profile.id)).toBeUndefined();
  });

  // ---- listEntitlementEnabledModuleIds: orphan deactivation + shape -------

  it("returns only catalog-valid active modules and deactivates orphans", async () => {
    const TENANT_E = "20000000-0000-4000-8000-0000000000e0";
    const VALID_1 = "30000000-0000-4000-8000-000000000001";
    const VALID_2 = "30000000-0000-4000-8000-000000000002";
    const ORPHAN = "30000000-0000-4000-8000-0000000000ff";
    const DELETED_CAT = "30000000-0000-4000-8000-0000000000de";

    // The Master Data catalog now arrives via the HTTP port (D3), not a cross-schema JOIN. Its
    // VALID (non-deleted) set excludes ORPHAN (absent) and DELETED_CAT (soft-deleted).
    const catalog = stubCatalog([VALID_1, VALID_2]);

    // VALID_2 and ORPHAN are seeded as core-overrides to prove the orphan path
    // clears is_core_override while leaving the valid core module untouched.
    const seed = [
      [VALID_1, true, false],
      [VALID_2, true, true],
      [ORPHAN, true, true],
      [DELETED_CAT, true, false],
    ] as const;
    for (const [moduleId, isActive, isCore] of seed) {
      await pool.query(
        "INSERT INTO configurator.tenant_modules (iq_tenant_id, module_id, is_active, is_core_override) VALUES ($1,$2,$3,$4)",
        [TENANT_E, moduleId, isActive, isCore],
      );
    }

    const enabled = await listEntitlementEnabledModuleIds(db, catalog, TENANT_E);
    expect(enabled.map((r) => r.module_id).sort()).toEqual([VALID_1, VALID_2].sort());
    expect(enabled.every((r) => r.is_active)).toBe(true);

    const after = await pool.query<{
      module_id: string;
      is_active: boolean;
      is_core_override: boolean;
    }>(
      "SELECT module_id, is_active, is_core_override FROM configurator.tenant_modules WHERE iq_tenant_id = $1",
      [TENANT_E],
    );
    const byId = new Map(after.rows.map((r) => [r.module_id, r]));
    expect(byId.get(VALID_1)?.is_active).toBe(true);
    expect(byId.get(VALID_2)?.is_active).toBe(true);
    expect(byId.get(VALID_2)?.is_core_override).toBe(true);
    // Orphan (no catalog row) and deleted-catalog rows are deactivated and de-cored.
    expect(byId.get(ORPHAN)?.is_active).toBe(false);
    expect(byId.get(ORPHAN)?.is_core_override).toBe(false);
    expect(byId.get(DELETED_CAT)?.is_active).toBe(false);
    expect(byId.get(DELETED_CAT)?.is_core_override).toBe(false);
  });

  // ---- empty tenant: returns [] WITHOUT consulting the catalog ----

  it("returns [] without consulting the catalog when the tenant has no active modules", async () => {
    const TENANT_I = "20000000-0000-4000-8000-0000000000b0";
    let calls = 0;
    const catalog: PlatformModuleCatalogPort = {
      listValidModuleIds: async () => {
        calls += 1;
        return new Set<string>();
      },
    };
    const enabled = await listEntitlementEnabledModuleIds(db, catalog, TENANT_I);
    expect(enabled).toEqual([]);
    // No active modules → the catalog is never fetched (and no spurious throw if it were down).
    expect(calls).toBe(0);
  });

  // ---- trap #2a: a catalog FETCH FAILURE fails LOUD, never mass-deactivates ----

  it("propagates a catalog fetch failure WITHOUT deactivating anything (fail-loud, not closed)", async () => {
    const TENANT_F = "20000000-0000-4000-8000-0000000000f0";
    const MOD = "30000000-0000-4000-8000-0000000000a1";
    await pool.query(
      "INSERT INTO configurator.tenant_modules (iq_tenant_id, module_id, is_active, is_core_override) VALUES ($1,$2,true,true)",
      [TENANT_F, MOD],
    );

    const failing: PlatformModuleCatalogPort = {
      listValidModuleIds: async () => {
        throw new Error("Master Data internal modules fetch failed: HTTP 503");
      },
    };

    await expect(
      listEntitlementEnabledModuleIds(db, failing, TENANT_F),
    ).rejects.toThrow(/fetch failed/);

    // A transient catalog outage must not mass-deactivate: the module is untouched.
    const after = await pool.query<{ is_active: boolean }>(
      "SELECT is_active FROM configurator.tenant_modules WHERE iq_tenant_id = $1 AND module_id = $2",
      [TENANT_F, MOD],
    );
    expect(after.rows[0]?.is_active).toBe(true);
  });

  // ---- trap #2b: an authoritatively EMPTY catalog fails CLOSED, never mass-deactivates ----

  it("throws on an empty catalog while the tenant has active modules (no mass-deactivation)", async () => {
    const TENANT_H = "20000000-0000-4000-8000-0000000000c0";
    const MOD_1 = "30000000-0000-4000-8000-0000000000b1";
    const MOD_2 = "30000000-0000-4000-8000-0000000000b2";
    for (const moduleId of [MOD_1, MOD_2]) {
      await pool.query(
        "INSERT INTO configurator.tenant_modules (iq_tenant_id, module_id, is_active, is_core_override) VALUES ($1,$2,true,true)",
        [TENANT_H, moduleId],
      );
    }

    // A healthy platform catalog is never empty — an authoritative empty set here means corrupt /
    // misconfigured master-data (wrong/unseeded DB, env drift). It must fail loud, NOT deactivate
    // every module of the tenant (which, being sticky, would be permanent).
    const empty = stubCatalog([]);
    await expect(
      listEntitlementEnabledModuleIds(db, empty, TENANT_H),
    ).rejects.toThrow(/empty/i);

    const after = await pool.query<{ module_id: string; is_active: boolean }>(
      "SELECT module_id, is_active FROM configurator.tenant_modules WHERE iq_tenant_id = $1",
      [TENANT_H],
    );
    expect(after.rows.every((r) => r.is_active)).toBe(true); // nothing deactivated
    expect(after.rows).toHaveLength(2);
  });
});
