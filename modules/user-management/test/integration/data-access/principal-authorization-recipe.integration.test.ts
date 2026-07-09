import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyUserManagementSchemaMigration } from "../../../src/schema/apply-migration.js";
import { DrizzlePrincipalAuthorizationRepository } from "../../../src/data-access/principal-authorization-repository.js";
import { DrizzleUserAccessRepository } from "../../../src/data-access/user-access-repository.js";

// ---------------------------------------------------------------------------
// The recipe change of issue #60 / ADR-0037 is proven ONLY here, on real Citus.
// The in-memory doubles seed effective keys directly and are recipe-blind, so a broken JOIN would
// keep every unit test green — these CASES are load-bearing. We exercise
// DrizzlePrincipalAuthorizationRepository DIRECTLY (not via the principal service), so the ADR-0032
// tenant-entitlement intersection does not apply and no tenantEntitlementResolver is needed: the
// repository returns the raw resolved keys.
//
//   effective = (role_capabilities ⨝ user_roles) ∪ grant-overrides, EXCEPT deny-overrides
//   deny wins over role-derived, over grant-override, and over delegation.
//
// Opt-in via TEST_DATABASE_URL; skips otherwise.
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT = "a1111111-1111-4111-8111-111111111111";
const U = "11111111-1111-4111-8111-1111111111a1"; // Dr Singh
const S = "11111111-1111-4111-8111-1111111111b2"; // delegation source

const DOCTOR = "0d000000-0000-4000-8000-0000000000d1";
const NURSE = "0d000000-0000-4000-8000-0000000000d2";

// capability id -> key
const CAP = {
  A: { id: "ca000000-0000-4000-8000-0000000000a1", key: "opd:prescription:read" },
  B: { id: "ca000000-0000-4000-8000-0000000000b2", key: "opd:prescription:create" },
  C: { id: "ca000000-0000-4000-8000-0000000000c3", key: "opd:visit:read" },
  E: { id: "ca000000-0000-4000-8000-0000000000e5", key: "opd:vitals:read" },
  F: { id: "ca000000-0000-4000-8000-0000000000f6", key: "opd:note:read" },
  G: { id: "ca000000-0000-4000-8000-000000000067", key: "opd:consent:read" },
  D: { id: "ca000000-0000-4000-8000-0000000000d4", key: "opd:refer:create" },
  H: { id: "ca000000-0000-4000-8000-000000000078", key: "opd:order:create" },
} as const;

describeDb("principal authorization recipe (real Citus, ADR-0037)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let authz: DrizzlePrincipalAuthorizationRepository;
  let access: DrizzleUserAccessRepository;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS user_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS auth CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyUserManagementSchemaMigration(url);
    db = createDb(url);
    authz = new DrizzlePrincipalAuthorizationRepository(db);
    access = new DrizzleUserAccessRepository(db);
  }, 60_000);

  beforeEach(async () => {
    // DELETE children -> parents (fast; TRUNCATE CASCADE over Citus distributed tables is slow).
    for (const table of [
      "delegated_capability_grants",
      "user_capabilities",
      "user_clearances",
      "user_roles",
      "role_capabilities",
      "users",
      "roles",
      "capabilities",
    ]) {
      await pool.query(`DELETE FROM user_management.${table}`);
    }
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS user_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS auth CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  async function seedCapability(cap: { id: string; key: string }) {
    const [module, feature, action] = cap.key.split(":");
    await pool.query(
      `INSERT INTO user_management.capabilities (id, capability_key, module, feature, action, display_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cap.id, cap.key, module, feature, action, cap.key],
    );
  }

  async function seedRole(id: string, code: string) {
    await pool.query(
      `INSERT INTO user_management.roles (iq_tenant_id, id, code, role_type, display_name)
       VALUES ($1, $2, $3, 'clinical', $4)`,
      [TENANT, id, code, code],
    );
  }

  async function seedUser(id: string, name: string) {
    await pool.query(
      `INSERT INTO user_management.users (iq_tenant_id, id, full_name, status)
       VALUES ($1, $2, $3, 'active')`,
      [TENANT, id, name],
    );
  }

  async function addRoleCapability(roleId: string, capabilityId: string) {
    await pool.query(
      `INSERT INTO user_management.role_capabilities (iq_tenant_id, role_id, capability_id)
       VALUES ($1, $2, $3)`,
      [TENANT, roleId, capabilityId],
    );
  }

  async function assignRole(userId: string, roleId: string) {
    await pool.query(
      `INSERT INTO user_management.user_roles (iq_tenant_id, user_id, role_id)
       VALUES ($1, $2, $3)`,
      [TENANT, userId, roleId],
    );
  }

  async function addOverride(userId: string, capabilityId: string, effect: "grant" | "deny") {
    await pool.query(
      `INSERT INTO user_management.user_capabilities (iq_tenant_id, user_id, capability_id, effect)
       VALUES ($1, $2, $3, $4)`,
      [TENANT, userId, capabilityId, effect],
    );
  }

  async function addDelegation(sourceId: string, targetId: string, capabilityId: string) {
    await pool.query(
      `INSERT INTO user_management.delegated_capability_grants
         (iq_tenant_id, source_user_id, target_user_id, capability_id, starts_at, status)
       VALUES ($1, $2, $3, $4, now() - interval '1 hour', 'active')`,
      [TENANT, sourceId, targetId, capabilityId],
    );
  }

  /** Doctor -> {A,B,C}; Nurse -> {C,E}; users U (Dr Singh) and S (source); all capabilities. */
  async function seedWorld() {
    for (const cap of Object.values(CAP)) {
      await seedCapability(cap);
    }
    await seedRole(DOCTOR, "doctor");
    await seedRole(NURSE, "nurse");
    await seedUser(U, "Dr Singh");
    await seedUser(S, "Delegation Source");
    await addRoleCapability(DOCTOR, CAP.A.id);
    await addRoleCapability(DOCTOR, CAP.B.id);
    await addRoleCapability(DOCTOR, CAP.C.id);
    await addRoleCapability(NURSE, CAP.C.id);
    await addRoleCapability(NURSE, CAP.E.id);
  }

  it("CASE 1 — role-derived base: role capabilities resolve live (no snapshot)", async () => {
    await seedWorld();
    await assignRole(U, DOCTOR);

    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual(
      [CAP.A.key, CAP.B.key, CAP.C.key].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("CASE 2 — deny over role: 'restrict Dr Singh from B' removes B from effective", async () => {
    await seedWorld();
    await assignRole(U, DOCTOR);
    await addOverride(U, CAP.B.id, "deny");

    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual(
      [CAP.A.key, CAP.C.key].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("CASE 3 — orphan grant override survives role removal", async () => {
    await seedWorld();
    await assignRole(U, DOCTOR);
    await addOverride(U, CAP.F.id, "grant"); // F is on NO role

    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual(
      [CAP.A.key, CAP.B.key, CAP.C.key, CAP.F.key].sort((a, b) => a.localeCompare(b)),
    );

    await pool.query(
      `DELETE FROM user_management.user_roles WHERE iq_tenant_id = $1 AND user_id = $2 AND role_id = $3`,
      [TENANT, U, DOCTOR],
    );

    // Role capabilities vanish with the membership; the grant override (no role linkage) survives.
    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual([CAP.F.key]);
  });

  it("CASE 4 — deny wins over grant (single-row model: a granted cap flipped to deny is absent)", async () => {
    await seedWorld();
    // G is on no role: as a grant override it is present...
    await addOverride(U, CAP.G.id, "grant");
    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual([CAP.G.key]);

    // ...flip the single override row to deny (UNIQUE(tenant,user,cap) forbids two rows) -> absent.
    await pool.query(
      `UPDATE user_management.user_capabilities SET effect = 'deny'
        WHERE iq_tenant_id = $1 AND user_id = $2 AND capability_id = $3`,
      [TENANT, U, CAP.G.id],
    );
    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual([]);
  });

  it("CASE 5 — deny wins over delegation: a denied capability is excluded from delegated keys too", async () => {
    await seedWorld();
    await addDelegation(S, U, CAP.D.id);
    await addDelegation(S, U, CAP.A.id);
    await addOverride(U, CAP.D.id, "deny");

    // A remains delegated; D is denied and must NOT appear (Cerbos ORs the two arrays).
    expect(await authz.listDelegatedCapabilityKeys(TENANT, U)).toEqual([CAP.A.key]);
  });

  it("CASE 6 — role-definition edit propagates with no re-seed", async () => {
    await seedWorld();
    await assignRole(U, DOCTOR);
    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual(
      [CAP.A.key, CAP.B.key, CAP.C.key].sort((a, b) => a.localeCompare(b)),
    );

    // Add a capability to the role definition; no write to user_capabilities.
    await addRoleCapability(DOCTOR, CAP.H.id);

    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual(
      [CAP.A.key, CAP.B.key, CAP.C.key, CAP.H.key].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("CASE 7 — multi-role union with dedupe of the shared capability", async () => {
    await seedWorld();
    await assignRole(U, DOCTOR);
    await assignRole(U, NURSE);

    // Doctor {A,B,C} ∪ Nurse {C,E} = {A,B,C,E}, C appears once.
    expect(await authz.listEffectiveCapabilityKeys(TENANT, U)).toEqual(
      [CAP.A.key, CAP.B.key, CAP.C.key, CAP.E.key].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("CASE 8 — clearances are unaffected by the override reshape", async () => {
    await seedWorld();
    await pool.query(
      `INSERT INTO user_management.user_clearances (iq_tenant_id, user_id, clearance_key, clearance_level)
       VALUES ($1, $2, 'sensitivity', 'tier-3')`,
      [TENANT, U],
    );

    expect(await authz.getClearanceLevels(TENANT, U)).toEqual({ sensitivity: "tier-3" });
  });

  it("merge — replaceCapabilityOverrides resolves a cap in both grant+deny lists as a single deny row", async () => {
    await seedWorld();

    const result = await access.replaceCapabilityOverrides(TENANT, {
      userId: U,
      grants: [{ capability_id: CAP.A.id }],
      denies: [{ capability_id: CAP.A.id, reason: "explicitly restricted" }],
      actorId: null,
    });

    // Exactly one persisted row for A, effect deny (deny wins; UNIQUE forbids two rows).
    expect(result).toEqual([
      expect.objectContaining({ capability_key: CAP.A.key, effect: "deny", reason: "explicitly restricted" }),
    ]);
    const { rows } = await pool.query(
      `SELECT effect FROM user_management.user_capabilities
        WHERE iq_tenant_id = $1 AND user_id = $2 AND capability_id = $3`,
      [TENANT, U, CAP.A.id],
    );
    expect(rows).toEqual([{ effect: "deny" }]);
  });
});
