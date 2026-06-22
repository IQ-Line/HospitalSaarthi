import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyBillingSchemaMigration } from "../../../src/schema/apply-migration.js";
import { createBillingRepo } from "../../../src/data-access/billing.repository.js";
import { allocatePaymentNumber } from "../../../src/lib/allocate-sequence-number.js";
import { syncBillTotals } from "../../../src/lib/use-case.js";
import type { BillingRepo } from "../../../src/ports.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for billing (vet 2026-06-22, billing P1/P2):
//   - payment-number allocation is ATOMIC (concurrent calls never collide) —
//     the racy SELECT max()+1 it replaced would hand out duplicates here.
//   - the UNIQUE(iq_tenant_id, payment_number) backstop actually bites (23505).
//   - the PRE-TAX subtotal (P3) persists through the real Drizzle rollup.
// Opt-in via TEST_DATABASE_URL pointing at a throwaway CITUS instance (:5444).
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT = "c0000000-0000-4000-8000-0000000000c1";
const PATIENT = "d0000000-0000-4000-8000-0000000000d1";

describeDb("billing persistence (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let repo: BillingRepo;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS billing CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS empi CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyBillingSchemaMigration(url);
    // Minimal stand-in for the shared empi.sequence_counters that nextSequenceValue
    // (the atomic counter) writes to. Distributed by iq_tenant_id like production.
    await pool.query("CREATE SCHEMA empi");
    await pool.query(
      `CREATE TABLE empi.sequence_counters (
         iq_tenant_id uuid NOT NULL,
         sequence_name text NOT NULL,
         current_value bigint NOT NULL DEFAULT 0,
         PRIMARY KEY (iq_tenant_id, sequence_name)
       )`,
    );
    await pool.query("SELECT create_distributed_table('empi.sequence_counters', 'iq_tenant_id')");
    db = createDb(url);
    repo = createBillingRepo(db);
  }, 60_000);

  beforeEach(async () => {
    await pool.query("TRUNCATE billing.payments CASCADE");
    await pool.query("TRUNCATE billing.bills CASCADE");
    await pool.query("TRUNCATE billing.bill_items CASCADE");
    await pool.query("TRUNCATE empi.sequence_counters CASCADE");
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS billing CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS empi CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  it("allocates payment numbers atomically — concurrent calls never collide", async () => {
    const numbers = await Promise.all(
      Array.from({ length: 8 }, () => allocatePaymentNumber(db, TENANT)),
    );
    expect(new Set(numbers).size).toBe(8); // all distinct under concurrency
    const seqs = numbers.map((n) => Number(n.slice(-6))).sort((a, b) => a - b);
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("enforces UNIQUE(iq_tenant_id, payment_number) as a backstop", async () => {
    const insert = (num: string) =>
      pool.query(
        `INSERT INTO billing.payments
           (id, iq_tenant_id, payment_number, patient_id, amount, payment_method)
         VALUES ($1,$2,$3,$4,'10.0000','CASH')`,
        [randomUUID(), TENANT, num, PATIENT],
      );
    await insert("P-DUP-0001");
    await expect(insert("P-DUP-0001")).rejects.toMatchObject({ code: "23505" });
  });

  it("persists a PRE-TAX subtotal through the real rollup (non-zero tax)", async () => {
    const billId = randomUUID();
    await pool.query(
      "INSERT INTO billing.bills (id, iq_tenant_id, bill_number, patient_id) VALUES ($1,$2,$3,$4)",
      [billId, TENANT, "B-DB-000001", PATIENT],
    );
    await repo.insertItem({
      iq_tenant_id: TENANT,
      bill_id: billId,
      service_id: null,
      item_type: "SERVICE",
      item_code: "X",
      description: "Taxable service",
      quantity: "1.00",
      unit_price: "100.0000",
      gross_amount: "100.0000",
      discount_percentage: "0.0000",
      discount_amount: "0.0000",
      net_amount: "100.0000",
      tax_percentage: "18.0000",
      tax_amount: "18.0000",
      total_amount: "118.0000",
      source_module: "opd",
      source_ref: null,
      performed_date: null,
      performed_by: null,
      department: null,
      status: "ACTIVE",
      idempotency_key: null,
      notes: null,
    });

    const loaded = await repo.getBill(TENANT, billId);
    if (!loaded) throw new Error("seeded bill not found");
    await syncBillTotals(repo, TENANT, loaded.bill);

    const after = await repo.getBill(TENANT, billId);
    expect(after?.bill.subtotal).toBe("100.0000"); // pre-tax, NOT 118
    expect(after?.bill.tax_amount).toBe("18.0000");
    expect(after?.bill.total_amount).toBe("118.0000");
  });
});
