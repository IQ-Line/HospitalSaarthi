import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyUserManagementSchemaMigration } from "../../../src/schema/apply-migration.js";
import { DrizzleUserRepository } from "../../../src/data-access/user-repository.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for listUsers' optional role-name join (issue #128
// item 2). The repository defaults to a plain projection and pays the
// user_roles + roles LEFT JOIN / GROUP BY only when includeRoleDisplayNames is
// set. These prove against an actual Citus DB that:
//   - includeRoleDisplayNames: true aggregates each user's role display names
//     (deduped, sorted-agnostic, empty -> omitted)
//   - the default (flag off) omits role_display_names entirely and never joins
//   - the department filter still narrows in both modes
// Opt-in via TEST_DATABASE_URL; skips otherwise (mirrors the sibling
// user-provisioning integration test).
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT = "a3333333-3333-4333-8333-333333333333";

const USER_A = "31111111-1111-4111-8111-1111111111a1"; // two roles
const USER_B = "31111111-1111-4111-8111-1111111111b2"; // one role, other dept
const USER_C = "31111111-1111-4111-8111-1111111111c3"; // no roles

const ROLE_DOCTOR = "3e000000-0000-4000-8000-0000000000d1";
const ROLE_NURSE = "3e000000-0000-4000-8000-0000000000e2";

describeDb("listUsers role_display_names (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let repo: DrizzleUserRepository;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS user_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS auth CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyUserManagementSchemaMigration(url);
    db = createDb(url);
    repo = new DrizzleUserRepository(db);
  }, 60_000);

  beforeEach(async () => {
    for (const table of ["user_roles", "users", "roles"]) {
      await pool.query(`DELETE FROM user_management.${table}`);
    }
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS user_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS auth CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  async function seedUser(id: string, fullName: string, department: string | null) {
    await pool.query(
      `INSERT INTO user_management.users (iq_tenant_id, id, full_name, department)
       VALUES ($1, $2, $3, $4)`,
      [TENANT, id, fullName, department],
    );
  }

  async function seedRole(id: string, code: string, displayName: string) {
    await pool.query(
      `INSERT INTO user_management.roles (iq_tenant_id, id, code, role_type, display_name)
       VALUES ($1, $2, $3, 'clinical', $4)`,
      [TENANT, id, code, displayName],
    );
  }

  async function assignRole(userId: string, roleId: string) {
    await pool.query(
      `INSERT INTO user_management.user_roles (iq_tenant_id, user_id, role_id)
       VALUES ($1, $2, $3)`,
      [TENANT, userId, roleId],
    );
  }

  async function seedGraph() {
    await seedUser(USER_A, "Alice", "cardiology");
    await seedUser(USER_B, "Bob", "radiology");
    await seedUser(USER_C, "Carol", "cardiology");
    await seedRole(ROLE_DOCTOR, "doctor", "Doctor");
    await seedRole(ROLE_NURSE, "nurse", "Nurse");
    await assignRole(USER_A, ROLE_DOCTOR);
    await assignRole(USER_A, ROLE_NURSE);
    await assignRole(USER_B, ROLE_NURSE);
    // USER_C intentionally has no role assignment.
  }

  it("includeRoleDisplayNames aggregates each user's role display names", async () => {
    await seedGraph();

    const rows = await repo.listUsers(TENANT, { includeRoleDisplayNames: true });
    const byId = new Map(rows.map((u) => [u.id, u]));

    expect(rows).toHaveLength(3);
    expect([...(byId.get(USER_A)?.role_display_names ?? [])].sort()).toEqual(["Doctor", "Nurse"]);
    expect(byId.get(USER_B)?.role_display_names).toEqual(["Nurse"]);
    // No roles -> the field is omitted entirely (never an empty array).
    expect(byId.get(USER_C)?.role_display_names).toBeUndefined();
  });

  it("omits role_display_names on the default plain-projection path", async () => {
    await seedGraph();

    const rows = await repo.listUsers(TENANT);
    expect(rows).toHaveLength(3);
    for (const u of rows) {
      expect(u.role_display_names).toBeUndefined();
    }
    // The user with two role assignments is returned once (no join fan-out).
    expect(rows.filter((u) => u.id === USER_A)).toHaveLength(1);
  });

  it("applies the department filter in both modes", async () => {
    await seedGraph();

    const plain = await repo.listUsers(TENANT, { department: "cardiology" });
    expect(plain.map((u) => u.id).sort()).toEqual([USER_A, USER_C].sort());

    const withRoles = await repo.listUsers(TENANT, {
      department: "cardiology",
      includeRoleDisplayNames: true,
    });
    expect(withRoles.map((u) => u.id).sort()).toEqual([USER_A, USER_C].sort());
    expect([...(withRoles.find((u) => u.id === USER_A)?.role_display_names ?? [])].sort()).toEqual([
      "Doctor",
      "Nurse",
    ]);
  });
});
