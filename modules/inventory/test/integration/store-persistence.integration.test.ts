import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyInventorySchemaMigration } from "../../src/schema/apply-migration.js";
import { createStoreRepo } from "../../src/data-access/store.repo.js";
import type { StoreRepo } from "../../src/ports.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for inventory's store repository tenant scoping. This is
// the control that ACTUALLY enforces tenant isolation for inventory (see the note
// in src/authz/principal-tenant-hook.ts): every store query carries a
// `WHERE iq_tenant_id = <tenant>` filter, so a caller can never read another
// tenant's stores. The Cerbos policy's tenant-eq rule does not fire at runtime with
// the current resolver (it compares the principal tenant to itself), so without
// this test nothing proves cross-tenant reads are actually denied.
//
// Opt-in via TEST_DATABASE_URL pointing at a throwaway CITUS instance (:5444),
// same harness as the empi/billing/registration persistence tests. Unset => skipped.
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT_A = "a0000000-0000-4000-8000-00000000000a";
const TENANT_B = "b0000000-0000-4000-8000-00000000000b";
const STORE_TYPE_ID = "c0000000-0000-4000-8000-00000000000c";
const FACILITY_ID = "d0000000-0000-4000-8000-00000000000d";
const DEPARTMENT_ID = "e0000000-0000-4000-8000-00000000000e";

describeDb("inventory store persistence (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let repo: StoreRepo;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS inventory CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyInventorySchemaMigration(url);
    db = createDb(url);
    repo = createStoreRepo(db);
  }, 60_000);

  beforeEach(async () => {
    await pool.query("TRUNCATE inventory.stores CASCADE");
    await pool.query("TRUNCATE inventory.store_code_sequences CASCADE");
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS inventory CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  async function makeStore(tenantId: string, name = "Main Store") {
    return repo.create(
      tenantId,
      "MED",
      {
        store_name: name,
        store_type_id: STORE_TYPE_ID,
        facility_id: FACILITY_ID,
        department_id: DEPARTMENT_ID,
      },
      null,
    );
  }

  it("findById is tenant-scoped — tenant B cannot read tenant A's store (cross-tenant read denied)", async () => {
    const store = await makeStore(TENANT_A);

    const asOwner = await repo.findById(TENANT_A, store.id);
    expect(asOwner?.id).toBe(store.id);

    // Same store id, foreign tenant — the WHERE iq_tenant_id filter must exclude it.
    const asForeign = await repo.findById(TENANT_B, store.id);
    expect(asForeign).toBeUndefined();
  });

  it("list is tenant-scoped — one tenant's stores are invisible to another", async () => {
    await makeStore(TENANT_A, "A store");

    const aResult = await repo.list(TENANT_A, {});
    expect(aResult.total).toBe(1);
    expect(aResult.rows).toHaveLength(1);

    const bResult = await repo.list(TENANT_B, {});
    expect(bResult.total).toBe(0);
    expect(bResult.rows).toHaveLength(0);
  });
});
