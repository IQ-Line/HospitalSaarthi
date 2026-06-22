import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyEmpiSchemaMigration } from "../../../src/schema/apply-migration.js";
import { DrizzlePatientRepo } from "../../../src/data-access/patient.repo.js";
import { searchPatients } from "../../../src/use-cases/search-patients.js";
import type { Patient } from "../../../src/domain/patient.types.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for empi's repository layer (vet 2026-06-22, empi P4):
// tenant isolation, the registration dedup blocking query, merged-record
// exclusion, and pagination math — none of which a mocked repo can verify.
// Opt-in via TEST_DATABASE_URL pointing at a throwaway CITUS instance
// (hims-verify on :5444). Unset => skipped. See the configurator persistence
// test for the same harness rationale.
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT_A = "a0000000-0000-4000-8000-00000000000a";
const TENANT_B = "b0000000-0000-4000-8000-00000000000b";
const PHONE = "+919876500000";

describeDb("empi persistence (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let repo: DrizzlePatientRepo;
  let uhidSeq = 0;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS empi CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyEmpiSchemaMigration(url);
    db = createDb(url);
    repo = new DrizzlePatientRepo(db);
  }, 60_000);

  beforeEach(async () => {
    await pool.query("TRUNCATE empi.patients CASCADE");
    uhidSeq = 0;
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS empi CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  function nextUhid(): string {
    uhidSeq += 1;
    return `2501011234500${String(uhidSeq).padStart(4, "0")}`;
  }

  async function makePatient(
    tenantId: string,
    over: Partial<Patient> = {},
  ): Promise<Patient> {
    const first = over.first_name ?? "Test";
    return repo.create({
      iq_tenant_id: tenantId,
      first_name: first,
      last_name: over.last_name ?? null,
      gender: over.gender ?? "male",
      phone_number: over.phone_number ?? PHONE,
      uhid: over.uhid ?? nextUhid(),
      full_name: over.full_name ?? first,
    });
  }

  async function markMerged(tenantId: string, id: string, into: string): Promise<void> {
    await pool.query(
      "UPDATE empi.patients SET merged_into_id = $1 WHERE iq_tenant_id = $2 AND id = $3",
      [into, tenantId, id],
    );
  }

  it("findAll is tenant-scoped — one tenant's patients are invisible to another", async () => {
    await makePatient(TENANT_A);
    const aResult = await repo.findAll(TENANT_A, { phone_number: PHONE });
    expect(aResult.total).toBe(1);

    const bResult = await repo.findAll(TENANT_B, { phone_number: PHONE });
    expect(bResult.total).toBe(0);
    expect(bResult.data).toHaveLength(0);
  });

  it("findDedupCandidates blocks on phone+gender and excludes merged records", async () => {
    const target = await makePatient(TENANT_A, { gender: "male", phone_number: PHONE });
    await makePatient(TENANT_A, { gender: "female", phone_number: PHONE }); // wrong gender
    const merged = await makePatient(TENANT_A, { gender: "male", phone_number: PHONE });
    await markMerged(TENANT_A, merged.id, target.id);
    // Different tenant, same phone+gender — must not surface.
    await makePatient(TENANT_B, { gender: "male", phone_number: PHONE });

    const candidates = await repo.findDedupCandidates(TENANT_A, PHONE, "male");
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.id).toBe(target.id);
  });

  it("findAll paginates and excludes merged records from the total", async () => {
    await makePatient(TENANT_A);
    await makePatient(TENANT_A);
    await makePatient(TENANT_A);
    const merged = await makePatient(TENANT_A);
    await markMerged(TENANT_A, merged.id, merged.id);

    const page1 = await repo.findAll(TENANT_A, { phone_number: PHONE, page: 1, limit: 2 });
    expect(page1.total).toBe(3); // merged record excluded from the count
    expect(page1.data).toHaveLength(2);

    const page2 = await repo.findAll(TENANT_A, { phone_number: PHONE, page: 2, limit: 2 });
    expect(page2.data).toHaveLength(1);
    // No overlap between pages.
    const ids = new Set([...page1.data, ...page2.data].map((p) => p.id));
    expect(ids.size).toBe(3);
  });

  it("searchPatients computes total_pages from the real count", async () => {
    await makePatient(TENANT_A);
    await makePatient(TENANT_A);
    await makePatient(TENANT_A);

    const result = await searchPatients({ patientRepo: repo }, TENANT_A, {
      phone_number: PHONE,
      limit: 2,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.total).toBe(3);
      expect(result.page.limit).toBe(2);
      expect(result.page.total_pages).toBe(2); // ceil(3 / 2)
    }
  });
});
