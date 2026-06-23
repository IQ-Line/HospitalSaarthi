import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyPharmacySchemaMigration } from "../../../src/schema/apply-migration.js";
import { DrizzleDispenseRecordRepo } from "../../../src/data-access/dispense-record.repo.js";
import type { UpsertDispensePayload } from "../../../src/ports.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for DrizzleDispenseRecordRepo.upsertForVisit (pharmacy
// vet 2026-06-22, P1). The persisted subtotal/total_amount are recomputed
// AUTHORITATIVELY inside the repo transaction (dispense-record.repo.ts via
// computeRecordAmounts over buildDispenseLineRows) — a path the mocked unit
// tests prove nothing about (they assert pass-through of a fabricated repo
// result). This exercises the real INSERT/UPDATE branches, the line
// delete-and-replace on re-upsert, the 23505-retry safety net under genuine
// concurrency, and tenant scoping of the partial unique index — all asserted
// against actual rows queried straight from Postgres. Opt-in via
// TEST_DATABASE_URL (the hims-verify Citus on :5444); skips otherwise.
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT_A = "a0000000-0000-4000-8000-00000000000a";
const TENANT_B = "b0000000-0000-4000-8000-00000000000b";
const VISIT = "c0000000-0000-4000-8000-0000000000c1";
const PATIENT = "d0000000-0000-4000-8000-0000000000d1";
const MED_1 = "11111111-1111-4111-8111-111111111111";
const MED_2 = "22222222-2222-4222-8222-222222222222";
const MED_3 = "33333333-3333-4333-8333-333333333333";

function payload(over: Partial<UpsertDispensePayload> = {}): UpsertDispensePayload {
  return {
    visit_id: VISIT,
    patient_id: PATIENT,
    dispense_status: "issued",
    lines: [
      { medicine_id: MED_1, medicine_display_name: "Tab A", quantity_dispensed: "2", unit_amount: "10" },
      {
        medicine_id: MED_2,
        medicine_display_name: "Tab B",
        quantity_dispensed: "10",
        unit_amount: "10",
        line_discount: "20",
        tax_percent: "12",
      },
    ],
    discount: "5",
    ...over,
  };
}

describeDb("DrizzleDispenseRecordRepo.upsertForVisit (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let repo: DrizzleDispenseRecordRepo;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS pharmacy CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyPharmacySchemaMigration(url);
    db = createDb(url);
    repo = new DrizzleDispenseRecordRepo(db);
  }, 60_000);

  beforeEach(async () => {
    await pool.query("TRUNCATE pharmacy.dispense_line_items, pharmacy.dispense_records CASCADE");
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS pharmacy CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  // Poll until a backend is parked on a lock (the repo's INSERT waiting on the
  // blocker's uncommitted index slot). Throws rather than returning on timeout
  // so a missed block fails the test instead of skipping the retry path.
  async function waitForLockWait(): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query(
        "SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock'",
      );
      if (rows.length > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(
      "repo INSERT never blocked on the unique-index lock — cannot exercise the 23505 retry",
    );
  }

  async function readRecord(tenantId: string, visitId: string) {
    const { rows } = await pool.query<{
      id: string;
      subtotal: string;
      discount: string;
      total_amount: string;
      dispense_status: string;
      patient_id: string;
    }>(
      `SELECT id, subtotal::text, discount::text, total_amount::text, dispense_status, patient_id
         FROM pharmacy.dispense_records
        WHERE iq_tenant_id = $1 AND visit_id = $2 AND walk_in_order = false`,
      [tenantId, visitId],
    );
    return rows;
  }

  async function readLines(tenantId: string, recordId: string) {
    const { rows } = await pool.query<{
      medicine_display_name: string;
      quantity_dispensed: string;
      unit_amount: string;
      line_discount: string;
      tax_percent: string;
      tax_amount: string;
      line_total: string;
    }>(
      `SELECT medicine_display_name,
              quantity_dispensed::text, unit_amount::text, line_discount::text,
              tax_percent::text, tax_amount::text, line_total::text
         FROM pharmacy.dispense_line_items
        WHERE iq_tenant_id = $1 AND dispense_record_id = $2
        ORDER BY created_at, id`,
      [tenantId, recordId],
    );
    return rows;
  }

  it("inserts a new record and persists repo-computed subtotal/total + line billing", async () => {
    const result = await repo.upsertForVisit(TENANT_A, payload());

    // The returned object and the persisted row must agree (no silent drift).
    expect(result.record.subtotal).toBe("109.6000");
    expect(result.record.total_amount).toBe("104.6000");

    const records = await readRecord(TENANT_A, VISIT);
    expect(records).toHaveLength(1);
    // subtotal = 20.0000 (2*10) + 89.6000 ((100-20)*1.12); total = subtotal - 5.
    expect(records[0]).toMatchObject({
      id: result.record.id,
      subtotal: "109.6000",
      discount: "5.0000",
      total_amount: "104.6000",
      dispense_status: "issued",
      patient_id: PATIENT,
    });

    const lines = await readLines(TENANT_A, result.record.id);
    expect(lines).toHaveLength(2);
    const tabB = lines.find((l) => l.medicine_display_name === "Tab B");
    // The line billing is recomputed in the repo path, not trusted from input.
    expect(tabB).toMatchObject({
      line_discount: "20.0000",
      tax_percent: "12.0000",
      tax_amount: "9.6000",
      line_total: "89.6000",
    });
  });

  it("re-upsert updates in place and replaces (deletes) the prior line items", async () => {
    const first = await repo.upsertForVisit(TENANT_A, payload());
    const firstId = first.record.id;
    expect(await readLines(TENANT_A, firstId)).toHaveLength(2);

    const second = await repo.upsertForVisit(
      TENANT_A,
      payload({
        lines: [
          { medicine_id: MED_3, medicine_display_name: "Tab Z", quantity_dispensed: "3", unit_amount: "15" },
        ],
        discount: undefined,
      }),
    );

    // Same record row updated in place (not a second row).
    expect(second.record.id).toBe(firstId);
    const records = await readRecord(TENANT_A, VISIT);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: firstId,
      subtotal: "45.0000", // 3 * 15
      discount: "0.0000",
      total_amount: "45.0000",
    });

    // Old lines are gone; only the new single line remains.
    const lines = await readLines(TENANT_A, firstId);
    expect(lines).toHaveLength(1);
    expect(lines[0].medicine_display_name).toBe("Tab Z");
    expect(lines.map((l) => l.medicine_display_name)).not.toContain("Tab A");
    expect(lines.map((l) => l.medicine_display_name)).not.toContain("Tab B");
  });

  it("recovers from a real 23505 via retry (held-lock forces the unique-index collision)", async () => {
    // DETERMINISTIC reproduction of the lost-race the retry guards. A naive
    // Promise.all is unreliable: once Citus has cached the distributed plan the
    // winner commits before the others reach INSERT, so the race serializes away
    // and no 23505 is ever thrown (measured: 0/5 in full-suite). Instead a
    // second connection seeds a CONFLICTING (tenant,visit) row but holds it
    // UNCOMMITTED, occupying the partial-unique-index slot while staying
    // invisible to the repo's READ COMMITTED existence check.
    const blockerPool = createPool(url);
    const blocker = await blockerPool.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query(
        `INSERT INTO pharmacy.dispense_records
           (id, iq_tenant_id, walk_in_order, visit_id, patient_id, subtotal, discount, total_amount, dispense_status)
         VALUES (gen_random_uuid(), $1, false, $2, $3, '1', '0', '1', 'issued')`,
        [TENANT_A, VISIT, PATIENT],
      );

      // The repo finds no existing row, takes the INSERT branch, and BLOCKS on
      // the slot held by the uncommitted blocker. Intentionally not awaited yet.
      const upsertPromise = repo.upsertForVisit(
        TENANT_A,
        payload({
          lines: [
            { medicine_id: MED_1, medicine_display_name: "Tab A", quantity_dispensed: "1", unit_amount: "10" },
          ],
          discount: undefined,
        }),
      );

      // Synchronize on the lock-wait: this PROVES the repo's INSERT passed the
      // existence check and is committed to the INSERT path. Fail loudly if it
      // never blocks, so the test can never silently stop exercising the retry.
      await waitForLockWait();

      // Releasing the blocker turns the repo's blocked INSERT into a genuine
      // drizzle-wrapped 23505; the retry must catch it (.cause) and fall through
      // to the UPDATE branch instead of propagating.
      await blocker.query("COMMIT");

      const result = await upsertPromise; // must RESOLVE, not reject
      // The retry's UPDATE overwrote the blocker's seed (subtotal '1' -> '10').
      expect(result.record.subtotal).toBe("10.0000");
    } finally {
      blocker.release();
      await blockerPool.end();
    }

    const records = await readRecord(TENANT_A, VISIT);
    expect(records).toHaveLength(1);
    expect(records[0].subtotal).toBe("10.0000");
    // Delete-and-replace under retry leaves exactly one clean line set (the
    // blocker seeded none; the repo's own line is what remains).
    const lines = await readLines(TENANT_A, records[0].id);
    expect(lines).toHaveLength(1);
    expect(lines[0].medicine_display_name).toBe("Tab A");
  });

  it("scopes the unique index + reads by tenant (same visit_id across tenants is distinct)", async () => {
    const a = await repo.upsertForVisit(
      TENANT_A,
      payload({
        lines: [
          { medicine_id: MED_1, medicine_display_name: "A-only", quantity_dispensed: "1", unit_amount: "10" },
        ],
        discount: undefined,
      }),
    );
    // Same visit_id under a different tenant must NOT collide on the unique index.
    const b = await repo.upsertForVisit(
      TENANT_B,
      payload({
        lines: [
          { medicine_id: MED_2, medicine_display_name: "B-only", quantity_dispensed: "2", unit_amount: "10" },
        ],
        discount: undefined,
      }),
    );
    expect(a.record.id).not.toBe(b.record.id);

    const foundA = await repo.findByVisit(TENANT_A, VISIT);
    const foundB = await repo.findByVisit(TENANT_B, VISIT);
    expect(foundA?.id).toBe(a.record.id);
    expect(foundA?.iq_tenant_id).toBe(TENANT_A);
    expect(foundB?.id).toBe(b.record.id);
    expect(foundB?.iq_tenant_id).toBe(TENANT_B);

    // Lines never bleed across tenants.
    const linesA = await repo.findLinesByRecordId(TENANT_A, a.record.id);
    expect(linesA).toHaveLength(1);
    expect(linesA[0].medicine_display_name).toBe("A-only");
    expect(linesA.every((l) => l.iq_tenant_id === TENANT_A)).toBe(true);
    // Tenant B cannot read tenant A's lines.
    expect(await repo.findLinesByRecordId(TENANT_B, a.record.id)).toHaveLength(0);
  });
});
