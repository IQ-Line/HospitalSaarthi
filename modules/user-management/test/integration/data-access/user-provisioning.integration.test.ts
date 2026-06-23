import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyUserManagementSchemaMigration } from "../../../src/schema/apply-migration.js";
import { DrizzleUserProvisioningRepository } from "../../../src/data-access/user-provisioning-repository.js";
import { DrizzlePrincipalAuthorizationRepository } from "../../../src/data-access/principal-authorization-repository.js";
import { DuplicateUsernameError } from "../../../src/domain/errors.js";
import type {
  ProvisionUserWithAccessInput,
  RoleTemplateGrantPlan,
} from "../../../src/ports/user-provisioning-repository.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for the user-management persistence layer (vet
// 2026-06-22, UM P1). The mocked/in-memory tests never exercise real SQL, so
// these prove against an actual Citus DB:
//   - provisionUserWithAccess persists the user + manual & role-template grants
//   - duplicate-username -> DuplicateUsernameError (validates the .cause-unwrap
//     fix in postgres-errors.ts: the in-memory double never wraps the error, so
//     ONLY a real driver violation exercises isPostgresUniqueViolation)
//   - the multi-statement transaction is ATOMIC (a late failure rolls back the
//     user row AND the capability grants written earlier in the same tx)
//   - listEffectiveCapabilityKeys is snapshot-only (never unions role_capabilities),
//     filters revoked grants, and is tenant-scoped
// Opt-in via TEST_DATABASE_URL (the hims-verify Citus on :5444); skips otherwise.
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT_1 = "a1111111-1111-4111-8111-111111111111";
const TENANT_2 = "a2222222-2222-4222-8222-222222222222";
const AUTH_UID = "f0000000-0000-4000-8000-0000000000f0";

const USER_A = "11111111-1111-4111-8111-1111111111a1";
const USER_B = "11111111-1111-4111-8111-1111111111b2";
const USER_C = "11111111-1111-4111-8111-1111111111c3";
const USER_D = "11111111-1111-4111-8111-1111111111d4";

const CAP_A = "ca000000-0000-4000-8000-0000000000a1"; // users:users:read
const CAP_B = "cb000000-0000-4000-8000-0000000000b2"; // users:users:create
const CAP_C = "cc000000-0000-4000-8000-0000000000c3"; // billing:bills:read (template-only)
const ROLE_1 = "0e000000-0000-4000-8000-0000000000e1";
const MISSING_ROLE = "0e000000-0000-4000-8000-00000000dead";

function makeInput(args: {
  userId: string;
  username: string | null;
  manualCapabilityIds?: string[];
  roleTemplateGrants?: RoleTemplateGrantPlan[];
  email?: string | null;
}): ProvisionUserWithAccessInput {
  return {
    userId: args.userId,
    user: {
      full_name: "Test User",
      email: args.email ?? null,
      phone: null,
      username: args.username,
      org_id: null,
      department: null,
      clearance_tier_required: 0,
    },
    recoveryTier: args.email ? "standard" : "admin_only",
    authUserId: AUTH_UID,
    manualCapabilityIds: args.manualCapabilityIds ?? [],
    roleTemplateGrants: args.roleTemplateGrants ?? [],
    actorId: null,
  };
}

describeDb("user-management persistence (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let provisioning: DrizzleUserProvisioningRepository;
  let principalAuthz: DrizzlePrincipalAuthorizationRepository;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS user_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS auth CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyUserManagementSchemaMigration(url);
    db = createDb(url);
    provisioning = new DrizzleUserProvisioningRepository(db);
    principalAuthz = new DrizzlePrincipalAuthorizationRepository(db);
  }, 60_000);

  beforeEach(async () => {
    // DELETE (children -> parents), NOT TRUNCATE: TRUNCATE CASCADE over six Citus
    // distributed tables runs a multi-shard 2PC that takes ~5-9s and straddles
    // vitest's 10s hook timeout (flaky); DELETE is ~100x faster here. Each runs
    // as its own statement — Citus forbids mixing reference-table (capabilities)
    // and distributed-table DML inside a single (multi-statement) transaction.
    for (const table of [
      "user_capabilities",
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

  async function seedCapability(id: string, module: string, feature: string, action: string) {
    const key = `${module}:${feature}:${action}`;
    await pool.query(
      `INSERT INTO user_management.capabilities (id, capability_key, module, feature, action, display_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, key, module, feature, action, key],
    );
    return key;
  }

  async function seedRole(tenantId: string, id: string, code: string) {
    await pool.query(
      `INSERT INTO user_management.roles (iq_tenant_id, id, code, role_type, display_name)
       VALUES ($1, $2, $3, 'clinical', $4)`,
      [tenantId, id, code, code],
    );
  }

  it("persists the user, a manual grant, and a role-template grant atomically", async () => {
    await seedCapability(CAP_A, "users", "users", "read");
    await seedCapability(CAP_B, "users", "users", "create");
    await seedRole(TENANT_1, ROLE_1, "nurse");

    const result = await provisioning.provisionUserWithAccess(
      TENANT_1,
      makeInput({
        userId: USER_A,
        username: "alice",
        manualCapabilityIds: [CAP_A],
        roleTemplateGrants: [{ roleId: ROLE_1, capabilityIds: [CAP_B] }],
      }),
    );
    expect(result.id).toBe(USER_A);
    expect(result.username).toBe("alice");

    const { rows: userRows } = await pool.query(
      "SELECT id, username, auth_user_id FROM user_management.users WHERE iq_tenant_id = $1",
      [TENANT_1],
    );
    expect(userRows).toHaveLength(1);
    expect(userRows[0]).toMatchObject({ id: USER_A, username: "alice", auth_user_id: AUTH_UID });

    // grant_source is distinct per origin and the role-template grant records its source role.
    const { rows: capRows } = await pool.query(
      `SELECT capability_id, grant_source, source_role_id
         FROM user_management.user_capabilities
        WHERE iq_tenant_id = $1 AND user_id = $2 ORDER BY capability_id`,
      [TENANT_1, USER_A],
    );
    expect(capRows).toEqual([
      { capability_id: CAP_A, grant_source: "manual", source_role_id: null },
      { capability_id: CAP_B, grant_source: "role_template", source_role_id: ROLE_1 },
    ]);

    const { rows: roleRows } = await pool.query(
      "SELECT role_id FROM user_management.user_roles WHERE iq_tenant_id = $1 AND user_id = $2",
      [TENANT_1, USER_A],
    );
    expect(roleRows).toEqual([{ role_id: ROLE_1 }]);
  });

  it("maps a duplicate username to DuplicateUsernameError and persists nothing new", async () => {
    await provisioning.provisionUserWithAccess(
      TENANT_1,
      makeInput({ userId: USER_A, username: "dupe" }),
    );

    // Same (tenant, username) -> real driver 23505 (drizzle-wrapped on .cause).
    await expect(
      provisioning.provisionUserWithAccess(
        TENANT_1,
        makeInput({ userId: USER_B, username: "dupe" }),
      ),
    ).rejects.toBeInstanceOf(DuplicateUsernameError);

    const { rows } = await pool.query(
      "SELECT id FROM user_management.users WHERE iq_tenant_id = $1 AND username = $2",
      [TENANT_1, "dupe"],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(USER_A); // the loser (USER_B) was rolled back
  });

  it("rolls back the whole transaction when a later statement fails (atomicity)", async () => {
    await seedCapability(CAP_A, "users", "users", "read");

    // The user insert + manual grant succeed, then the role-template's user_roles
    // insert hits an FK violation (role does not exist) -> the whole tx must abort.
    await expect(
      provisioning.provisionUserWithAccess(
        TENANT_1,
        makeInput({
          userId: USER_C,
          username: "carol",
          manualCapabilityIds: [CAP_A],
          roleTemplateGrants: [{ roleId: MISSING_ROLE, capabilityIds: [CAP_A] }],
        }),
      ),
    ).rejects.toThrow();

    const { rows: userRows } = await pool.query(
      "SELECT id FROM user_management.users WHERE iq_tenant_id = $1 AND id = $2",
      [TENANT_1, USER_C],
    );
    expect(userRows).toHaveLength(0); // no orphaned user
    const { rows: capRows } = await pool.query(
      "SELECT id FROM user_management.user_capabilities WHERE iq_tenant_id = $1 AND user_id = $2",
      [TENANT_1, USER_C],
    );
    expect(capRows).toHaveLength(0); // the earlier manual grant was rolled back too
  });

  it("allows the same username under a different tenant (per-tenant uniqueness)", async () => {
    const a = await provisioning.provisionUserWithAccess(
      TENANT_1,
      makeInput({ userId: USER_A, username: "shared" }),
    );
    const b = await provisioning.provisionUserWithAccess(
      TENANT_2,
      makeInput({ userId: USER_B, username: "shared" }),
    );
    expect(a.id).toBe(USER_A);
    expect(b.id).toBe(USER_B);

    const { rows } = await pool.query(
      "SELECT iq_tenant_id FROM user_management.users WHERE username = $1 ORDER BY iq_tenant_id",
      ["shared"],
    );
    expect(rows.map((r) => r.iq_tenant_id)).toEqual([TENANT_1, TENANT_2]);
  });

  it("listEffectiveCapabilityKeys is snapshot-only, revoked-filtered, and tenant-scoped", async () => {
    const keyA = await seedCapability(CAP_A, "users", "users", "read");
    await seedCapability(CAP_B, "users", "users", "create");
    await seedCapability(CAP_C, "billing", "bills", "read");
    await seedRole(TENANT_1, ROLE_1, "nurse");

    // Tenant 1 user with two manual grants AND membership in ROLE_1 (empty
    // capability set, so the role contributes no user_capabilities rows itself).
    await provisioning.provisionUserWithAccess(
      TENANT_1,
      makeInput({
        userId: USER_A,
        username: "snap",
        manualCapabilityIds: [CAP_A, CAP_B],
        roleTemplateGrants: [{ roleId: ROLE_1, capabilityIds: [] }],
      }),
    );
    // ...one manual grant is then revoked (must drop out of the effective set).
    await pool.query(
      `UPDATE user_management.user_capabilities SET revoked_at = now()
        WHERE iq_tenant_id = $1 AND user_id = $2 AND capability_id = $3`,
      [TENANT_1, USER_A, CAP_B],
    );
    // CAP_C lives ONLY in ROLE_1's role_capabilities template — the user is a
    // member of ROLE_1 but was never granted CAP_C as a user_capability. A
    // snapshot-only read must NOT surface it; a read that unions role_capabilities
    // through user_roles would (this is why USER_A is a ROLE_1 member above).
    await pool.query(
      `INSERT INTO user_management.role_capabilities (iq_tenant_id, role_id, capability_id)
       VALUES ($1, $2, $3)`,
      [TENANT_1, ROLE_1, CAP_C],
    );
    // A different tenant holds CAP_A actively — must not bleed across tenants.
    await provisioning.provisionUserWithAccess(
      TENANT_2,
      makeInput({ userId: USER_D, username: "snap", manualCapabilityIds: [CAP_A] }),
    );

    expect(await principalAuthz.listEffectiveCapabilityKeys(TENANT_1, USER_A)).toEqual([keyA]);
    // Sanity: tenant 2's own grant resolves independently.
    expect(await principalAuthz.listEffectiveCapabilityKeys(TENANT_2, USER_D)).toEqual([keyA]);
  });
});
