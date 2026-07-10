import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyUserManagementSchemaMigration } from "../../../src/schema/apply-migration.js";
import { DrizzleUserActivationStatusReader } from "../../../src/data-access/user-activation-status-reader.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for the D13 ban-cutoff reader. The unit tests stub the
// reader, so ONLY this proves the raw cross-schema SQL against an actual DB:
//   - the text↔uuid join bridge (auth."user".id = users.auth_user_id::text) —
//     a wrong cast makes the join silently MISS, COALESCE-ing banned to false and
//     letting banned users through, so the ban cases below are the real assertion
//   - the "banExpires" column casing + Date mapping
//   - LEFT JOIN keeps auth-less users resolvable (banned defaults false)
//   - tenant scoping + unknown-user -> null
// Opt-in via TEST_DATABASE_URL (the hims-verify Citus); skips otherwise.
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT_1 = "a1111111-1111-4111-8111-111111111111";
const TENANT_2 = "a2222222-2222-4222-8222-222222222222";

// users.id === auth."user".id (the provisioner sets them equal); auth ids are the
// text form of these uuids, exercising the ::text join bridge.
const U_ACTIVE_NO_AUTH = "11111111-1111-4111-8111-1111111111a1";
const U_ACTIVE_UNBANNED = "11111111-1111-4111-8111-1111111111b2";
const U_ACTIVE_BANNED_PERM = "11111111-1111-4111-8111-1111111111c3";
const U_ACTIVE_BANNED_FUTURE = "11111111-1111-4111-8111-1111111111d4";
const U_INACTIVE = "11111111-1111-4111-8111-1111111111e5";

const BAN_FUTURE = new Date("2099-01-01T00:00:00.000Z");

describeDb("DrizzleUserActivationStatusReader (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let reader: DrizzleUserActivationStatusReader;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS user_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS auth CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyUserManagementSchemaMigration(url);
    db = createDb(url);
    reader = new DrizzleUserActivationStatusReader(db);
  }, 60_000);

  beforeEach(async () => {
    await pool.query("DELETE FROM user_management.users");
    await pool.query('DELETE FROM auth."user"');
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS user_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS auth CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  async function seedUser(
    id: string,
    status: string,
    authUserId: string | null,
    tenantId = TENANT_1,
    mustChangePassword = false,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO user_management.users (iq_tenant_id, id, full_name, status, auth_user_id, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, id, "Test User", status, authUserId, mustChangePassword],
    );
  }

  async function seedAuthUser(
    id: string,
    banned: boolean,
    banExpires: Date | null,
    tenantId = TENANT_1,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO auth."user" (id, name, email, "iq_tenant_id", banned, "banExpires")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, "Test User", `${id}@auth.internal`, tenantId, banned, banExpires],
    );
  }

  it("active user with no linked auth account -> banned defaults false (LEFT JOIN)", async () => {
    await seedUser(U_ACTIVE_NO_AUTH, "active", null);
    expect(await reader.getActivationFacts(TENANT_1, U_ACTIVE_NO_AUTH)).toEqual({
      status: "active",
      banned: false,
      banExpires: null,
      mustChangePassword: false,
    });
  });

  it("active, linked, unbanned -> active facts (join matches, banned false)", async () => {
    await seedUser(U_ACTIVE_UNBANNED, "active", U_ACTIVE_UNBANNED);
    await seedAuthUser(U_ACTIVE_UNBANNED, false, null);
    expect(await reader.getActivationFacts(TENANT_1, U_ACTIVE_UNBANNED)).toEqual({
      status: "active",
      banned: false,
      banExpires: null,
      mustChangePassword: false,
    });
  });

  it("reads must_change_password from the users row (active + flagged)", async () => {
    await seedUser(U_ACTIVE_UNBANNED, "active", U_ACTIVE_UNBANNED, TENANT_1, true);
    await seedAuthUser(U_ACTIVE_UNBANNED, false, null);
    expect(await reader.getActivationFacts(TENANT_1, U_ACTIVE_UNBANNED)).toEqual({
      status: "active",
      banned: false,
      banExpires: null,
      mustChangePassword: true,
    });
  });

  it("permanently banned (banExpires null) -> banned true via the text↔uuid join", async () => {
    await seedUser(U_ACTIVE_BANNED_PERM, "active", U_ACTIVE_BANNED_PERM);
    await seedAuthUser(U_ACTIVE_BANNED_PERM, true, null);
    expect(await reader.getActivationFacts(TENANT_1, U_ACTIVE_BANNED_PERM)).toEqual({
      status: "active",
      banned: true,
      banExpires: null,
      mustChangePassword: false,
    });
  });

  it("banned with a future expiry -> banned true + the expiry Date (banExpires casing)", async () => {
    await seedUser(U_ACTIVE_BANNED_FUTURE, "active", U_ACTIVE_BANNED_FUTURE);
    await seedAuthUser(U_ACTIVE_BANNED_FUTURE, true, BAN_FUTURE);
    const facts = await reader.getActivationFacts(TENANT_1, U_ACTIVE_BANNED_FUTURE);
    expect(facts?.status).toBe("active");
    expect(facts?.banned).toBe(true);
    expect(facts?.banExpires?.getTime()).toBe(BAN_FUTURE.getTime());
  });

  it("inactive platform status is reported verbatim", async () => {
    await seedUser(U_INACTIVE, "inactive", null);
    expect(await reader.getActivationFacts(TENANT_1, U_INACTIVE)).toEqual({
      status: "inactive",
      banned: false,
      banExpires: null,
      mustChangePassword: false,
    });
  });

  it("unknown user id -> null", async () => {
    expect(await reader.getActivationFacts(TENANT_1, U_ACTIVE_NO_AUTH)).toBeNull();
  });

  it("is tenant-scoped: a user is not visible under another tenant", async () => {
    await seedUser(U_ACTIVE_NO_AUTH, "active", null, TENANT_1);
    expect(await reader.getActivationFacts(TENANT_2, U_ACTIVE_NO_AUTH)).toBeNull();
  });
});
