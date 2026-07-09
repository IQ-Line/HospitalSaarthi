import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { allocateIdentifier } from "@hims/ts-sdk-sequence";
import { applyRegistrationSchemaMigration } from "../../../src/schema/apply-migration.js";
import { DrizzleVisitRepo } from "../../../src/data-access/visit.repo.js";
import { DrizzleRegistrationRepo } from "../../../src/data-access/registration.repo.js";
import type { CreateVisitInput } from "../../../src/domain/visit.types.js";
import type { CreateRegistrationInput } from "../../../src/domain/registration.types.js";

// ---------------------------------------------------------------------------
// Real-Postgres coverage for the registration data-access layer (registration
// vet 2026-06-22, P1). The mocked use-case tests prove nothing about the actual
// idempotency SQL. Both repos live in ONE file (not two) so the schema setup
// runs once — two files would race on the shared `drizzle`/`registration`
// schemas under vitest's file parallelism. Exercises against real distributed
// Citus tables: the insert pre-check replay, the same-patient re-intake patch,
// the 23505-retry safety net (broken before this fix — the catch only inspected
// the top-level `.code`, but drizzle wraps the pg error in `.cause`, so the
// retry never fired), tenant scoping of the partial unique indexes, the
// abha-address lookup, and the free-follow-up support queries that
// create-visit's eligibility logic trusts. Opt-in via TEST_DATABASE_URL (the
// hims-verify Citus on :5444); skips otherwise.
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT_A = "a0000000-0000-4000-8000-00000000000a";
const TENANT_B = "b0000000-0000-4000-8000-00000000000b";
const PATIENT = "d0000000-0000-4000-8000-0000000000d1";
const PATIENT_2 = "d0000000-0000-4000-8000-0000000000d2";
const DEPT = "e0000000-0000-4000-8000-0000000000e1";
const DEPT_2 = "e0000000-0000-4000-8000-0000000000e2";
const SRC = "c0000000-0000-4000-8000-0000000000c1";
const ACTOR = "f0000000-0000-4000-8000-0000000000f1";

describeDb("registration data-access (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let visitRepo: DrizzleVisitRepo;
  let registrationRepo: DrizzleRegistrationRepo;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS registration CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyRegistrationSchemaMigration(url);
    db = createDb(url);
    visitRepo = new DrizzleVisitRepo(db);
    registrationRepo = new DrizzleRegistrationRepo(db);
  }, 60_000);

  beforeEach(async () => {
    // Per-statement DELETE (not TRUNCATE) — a multi-table TRUNCATE CASCADE over
    // Citus distributed tables runs a slow multi-shard 2PC that straddles the
    // default 10s hook timeout. No FK between the two tables, so order is free.
    await pool.query("DELETE FROM registration.visit");
    await pool.query("DELETE FROM registration.registration");
    await pool.query("DELETE FROM registration.sequence_counters");
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS registration CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  // Poll until the repo's INSERT is parked on the unique-index lock held by the
  // uncommitted blocker. Scoped to the target table so an unrelated lock can't
  // satisfy it early. Throws on timeout so a missed block fails loudly.
  async function waitForBlockedInsert(table: '"registration"."visit"' | '"registration"."registration"'): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query(
        `SELECT 1 FROM pg_stat_activity
          WHERE wait_event_type = 'Lock' AND query ILIKE $1`,
        [`%into ${table}%`],
      );
      if (rows.length > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`repo INSERT into ${table} never blocked on the unique-index lock`);
  }

  // ─── DrizzleVisitRepo ─────────────────────────────────────────────────────

  describe("DrizzleVisitRepo", () => {
    function input(over: Partial<CreateVisitInput> = {}): CreateVisitInput {
      return { patient_id: PATIENT, department_id: DEPT, consultation_type: "new", ...over };
    }

    async function readVisits(tenantId: string, idempotencyKey: string) {
      const { rows } = await pool.query<{
        id: string;
        visit_id: string;
        patient_id: string;
        status: string;
        consultation_type: string;
        idempotency_key: string;
      }>(
        `SELECT id, visit_id, patient_id, status, consultation_type, idempotency_key
           FROM registration.visit
          WHERE iq_tenant_id = $1 AND idempotency_key = $2`,
        [tenantId, idempotencyKey],
      );
      return rows;
    }

    async function seedVisit(opts: {
      tenant: string;
      visitId: string;
      patient: string;
      dept: string | null;
      consultation: string;
      status: string;
      createdAt?: string;
    }): Promise<void> {
      await pool.query(
        `INSERT INTO registration.visit
           (id, iq_tenant_id, visit_id, patient_id, department_id, consultation_type, status, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()))`,
        [opts.tenant, opts.visitId, opts.patient, opts.dept, opts.consultation, opts.status, opts.createdAt ?? null],
      );
    }

    it("inserts a visit and persists it (created:true)", async () => {
      const result = await visitRepo.insert(TENANT_A, input(), "OP-100", "k1", ACTOR, "in_progress");
      expect(result.created).toBe(true);

      const rows = await readVisits(TENANT_A, "k1");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: result.record.id,
        visit_id: "OP-100",
        patient_id: PATIENT,
        status: "in_progress",
        consultation_type: "new",
        idempotency_key: "k1",
      });
    });

    it("replays the same idempotency key via the pre-check (created:false, one row)", async () => {
      const first = await visitRepo.insert(TENANT_A, input(), "OP-100", "k1", ACTOR, "in_progress");
      const second = await visitRepo.insert(TENANT_A, input(), "OP-200", "k1", ACTOR, "in_progress");

      expect(second.created).toBe(false);
      expect(second.record.id).toBe(first.record.id);
      expect(second.record.visit_id).toBe("OP-100");
      expect(await readVisits(TENANT_A, "k1")).toHaveLength(1);
    });

    it("recovers from a real 23505 via the .cause-unwrapping retry (held-lock race)", async () => {
      // Deterministic lost-race: a second connection seeds a CONFLICTING
      // (tenant, idempotency_key) row but holds it UNCOMMITTED, occupying the
      // partial-unique-index slot while invisible to the repo's READ COMMITTED
      // pre-check. The repo therefore takes the INSERT branch and blocks; on
      // COMMIT it gets a genuine drizzle-wrapped 23505 that the retry must catch.
      const blockerPool = createPool(url);
      const blocker = await blockerPool.connect();
      try {
        await blocker.query("BEGIN");
        await blocker.query(
          `INSERT INTO registration.visit
             (id, iq_tenant_id, visit_id, patient_id, idempotency_key, status, consultation_type)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', 'new')`,
          [TENANT_A, "OP-BLOCKER", PATIENT, "k-race"],
        );

        // Not awaited: its INSERT (visit_id OP-REPO, key k-race) blocks on the slot.
        const insertPromise = visitRepo.insert(TENANT_A, input(), "OP-REPO", "k-race", ACTOR, "in_progress");
        await waitForBlockedInsert('"registration"."visit"');
        await blocker.query("COMMIT");

        const result = await insertPromise; // must RESOLVE, not reject
        expect(result.created).toBe(false);
        // Replayed the blocker's committed row, not its own would-be insert.
        expect(result.record.visit_id).toBe("OP-BLOCKER");
      } finally {
        blocker.release();
        await blockerPool.end();
      }

      const rows = await readVisits(TENANT_A, "k-race");
      expect(rows).toHaveLength(1);
      expect(rows[0].visit_id).toBe("OP-BLOCKER");
    });

    it("scopes the idempotency unique index per tenant (same key, different tenants → two rows)", async () => {
      const a = await visitRepo.insert(TENANT_A, input(), "OP-A", "shared-key", ACTOR, "in_progress");
      const b = await visitRepo.insert(TENANT_B, input(), "OP-B", "shared-key", ACTOR, "in_progress");

      expect(a.created).toBe(true);
      expect(b.created).toBe(true);
      expect(a.record.id).not.toBe(b.record.id);
      expect(await readVisits(TENANT_A, "shared-key")).toHaveLength(1);
      expect(await readVisits(TENANT_B, "shared-key")).toHaveLength(1);
    });

    it("countFreeFollowUpVisits counts only non-cancelled free-followup visits in scope", async () => {
      await seedVisit({ tenant: TENANT_A, visitId: "OP-1", patient: PATIENT, dept: DEPT, consultation: "free-followup", status: "in_progress" });
      await seedVisit({ tenant: TENANT_A, visitId: "OP-2", patient: PATIENT, dept: DEPT, consultation: "free-followup", status: "completed" });
      // Excluded: cancelled free-followup, a 'new' visit, another department, another patient, another tenant.
      await seedVisit({ tenant: TENANT_A, visitId: "OP-3", patient: PATIENT, dept: DEPT, consultation: "free-followup", status: "cancelled" });
      await seedVisit({ tenant: TENANT_A, visitId: "OP-4", patient: PATIENT, dept: DEPT, consultation: "new", status: "in_progress" });
      await seedVisit({ tenant: TENANT_A, visitId: "OP-5", patient: PATIENT, dept: DEPT_2, consultation: "free-followup", status: "in_progress" });
      await seedVisit({ tenant: TENANT_A, visitId: "OP-6", patient: PATIENT_2, dept: DEPT, consultation: "free-followup", status: "in_progress" });
      await seedVisit({ tenant: TENANT_B, visitId: "OP-7", patient: PATIENT, dept: DEPT, consultation: "free-followup", status: "in_progress" });

      expect(await visitRepo.countFreeFollowUpVisits(TENANT_A, PATIENT, DEPT)).toBe(2);
      expect(await visitRepo.countFreeFollowUpVisits(TENANT_A, PATIENT, DEPT_2)).toBe(1);
      expect(await visitRepo.countFreeFollowUpVisits(TENANT_B, PATIENT, DEPT)).toBe(1);
    });

    it("findLatestByPatientAndDepartment returns the most recent in-scope visit", async () => {
      await seedVisit({ tenant: TENANT_A, visitId: "OP-OLD", patient: PATIENT, dept: DEPT, consultation: "new", status: "completed", createdAt: "2026-01-01T00:00:00Z" });
      await seedVisit({ tenant: TENANT_A, visitId: "OP-NEW", patient: PATIENT, dept: DEPT, consultation: "new", status: "completed", createdAt: "2026-03-01T00:00:00Z" });

      const latest = await visitRepo.findLatestByPatientAndDepartment(TENANT_A, PATIENT, DEPT);
      expect(latest?.visit_id).toBe("OP-NEW");

      expect(await visitRepo.findLatestByPatientAndDepartment(TENANT_A, PATIENT, DEPT_2)).toBeUndefined();
      expect(await visitRepo.findLatestByPatientAndDepartment(TENANT_B, PATIENT, DEPT)).toBeUndefined();
    });
  });

  // ─── DrizzleRegistrationRepo ──────────────────────────────────────────────

  describe("DrizzleRegistrationRepo", () => {
    function input(over: Partial<CreateRegistrationInput> = {}): CreateRegistrationInput {
      return {
        patient_id: PATIENT,
        patient_source_record_id: SRC,
        patient_snapshot: {
          uhid: "UHID-REPO",
          full_name: "Asha Rao",
          phone_number: "+919876500000",
          gender: "female",
          abha_number: null,
          abha_address: null,
          date_of_birth: null,
          year_of_birth: null,
        },
        ...over,
      };
    }

    async function readByPatient(tenantId: string, patientId: string) {
      const { rows } = await pool.query<{
        registration_id: string;
        patient_uhid: string;
        patient_full_name: string;
        patient_abha_address: string | null;
        patient_year_of_birth: number | null;
        idempotency_key: string | null;
        patient_source_record_id: string;
      }>(
        `SELECT registration_id, patient_uhid, patient_full_name, patient_abha_address,
                patient_year_of_birth, idempotency_key, patient_source_record_id
           FROM registration.registration
          WHERE iq_tenant_id = $1 AND patient_id = $2`,
        [tenantId, patientId],
      );
      return rows;
    }

    it("inserts a registration and persists the snapshot (created:true)", async () => {
      const result = await registrationRepo.insert(
        TENANT_A,
        input({ patient_snapshot: { ...input().patient_snapshot, abha_address: "asha@abdm" } }),
        "k1",
        ACTOR,
      );
      expect(result.created).toBe(true);

      const rows = await readByPatient(TENANT_A, PATIENT);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        registration_id: result.record.registration_id,
        patient_uhid: "UHID-REPO",
        patient_full_name: "Asha Rao",
        patient_abha_address: "asha@abdm",
        idempotency_key: "k1",
        patient_source_record_id: SRC,
      });
    });

    it("replays the same idempotency key via the pre-check (created:false, one row)", async () => {
      const first = await registrationRepo.insert(TENANT_A, input(), "k1", ACTOR);
      const second = await registrationRepo.insert(TENANT_A, input(), "k1", ACTOR);

      expect(second.created).toBe(false);
      expect(second.record.registration_id).toBe(first.record.registration_id);
      expect(await readByPatient(TENANT_A, PATIENT)).toHaveLength(1);
    });

    it("re-intakes the same patient (different key) by patching ABHA/DOB in place", async () => {
      const first = await registrationRepo.insert(TENANT_A, input(), "k1", ACTOR);

      const second = await registrationRepo.insert(
        TENANT_A,
        input({
          patient_snapshot: {
            ...input().patient_snapshot,
            abha_address: "asha@abdm",
            year_of_birth: 1990,
          },
        }),
        "k2",
        ACTOR,
      );

      expect(second.created).toBe(false);
      expect(second.record.registration_id).toBe(first.record.registration_id);

      const rows = await readByPatient(TENANT_A, PATIENT);
      expect(rows).toHaveLength(1);
      // The patch refreshed the demographics on the existing row.
      expect(rows[0].patient_abha_address).toBe("asha@abdm");
      expect(rows[0].patient_year_of_birth).toBe(1990);
      // The original key is preserved (the re-intake does not overwrite it).
      expect(rows[0].idempotency_key).toBe("k1");
    });

    it("recovers from a real 23505 via the findByPatientId fallback (held-lock patient collision)", async () => {
      // The patient-uniqueness race: a blocker holds an uncommitted row for the
      // SAME patient under a DIFFERENT idempotency key. The repo's pre-checks both
      // miss it (uncommitted), so it INSERTs and blocks on uq_registration_patient;
      // on COMMIT the 23505 fires and the retry must fall through findByIdempotencyKey
      // (no match — different key) to findByPatientId.
      const blockerPool = createPool(url);
      const blocker = await blockerPool.connect();
      try {
        await blocker.query("BEGIN");
        await blocker.query(
          `INSERT INTO registration.registration
             (iq_tenant_id, patient_id, patient_uhid, patient_full_name, patient_phone_number,
              patient_source_record_id, idempotency_key)
           VALUES ($1, $2, 'UHID-BLOCKER', 'Blocker Name', '+910000000000', $3, 'k-blocker')`,
          [TENANT_A, PATIENT, SRC],
        );

        // Not awaited: repo inserts patient=PATIENT under key 'k-repo' and blocks.
        const insertPromise = registrationRepo.insert(TENANT_A, input(), "k-repo", ACTOR);
        await waitForBlockedInsert('"registration"."registration"');
        await blocker.query("COMMIT");

        const result = await insertPromise; // must RESOLVE, not reject
        expect(result.created).toBe(false);
        // Fell back to findByPatientId → the blocker's row, not the repo's would-be insert.
        expect(result.record.patient_uhid).toBe("UHID-BLOCKER");
      } finally {
        blocker.release();
        await blockerPool.end();
      }

      const rows = await readByPatient(TENANT_A, PATIENT);
      expect(rows).toHaveLength(1);
      expect(rows[0].patient_uhid).toBe("UHID-BLOCKER");
    });

    it("scopes the patient unique index per tenant (same patient, different tenants → two rows)", async () => {
      const a = await registrationRepo.insert(TENANT_A, input(), "k1", ACTOR);
      const b = await registrationRepo.insert(TENANT_B, input(), "k1", ACTOR);

      expect(a.created).toBe(true);
      expect(b.created).toBe(true);
      expect(a.record.registration_id).not.toBe(b.record.registration_id);
      expect(await readByPatient(TENANT_A, PATIENT)).toHaveLength(1);
      expect(await readByPatient(TENANT_B, PATIENT)).toHaveLength(1);
    });

    it("findPatientIdByAbhaAddress resolves a tenant-scoped, trimmed match", async () => {
      await registrationRepo.insert(
        TENANT_A,
        input({ patient_snapshot: { ...input().patient_snapshot, abha_address: "asha@abdm" } }),
        "k1",
        ACTOR,
      );

      expect(await registrationRepo.findPatientIdByAbhaAddress(TENANT_A, "  asha@abdm  ")).toBe(PATIENT);
      // Wrong tenant / unknown address / empty input must not resolve.
      expect(await registrationRepo.findPatientIdByAbhaAddress(TENANT_B, "asha@abdm")).toBeUndefined();
      expect(await registrationRepo.findPatientIdByAbhaAddress(TENANT_A, "nobody@abdm")).toBeUndefined();
      expect(await registrationRepo.findPatientIdByAbhaAddress(TENANT_A, "   ")).toBeUndefined();
    });
  });

  // ─── op_visit allocation (registration.sequence_counters) ──────────────────
  // registration-svc's allocateOpVisitId now increments registration's OWN
  // counter table (no cross-schema write into empi.sequence_counters) with the
  // seq config injected instead of SQL-JOINed. Proves byte-identical format,
  // per-day increment, and per-tenant isolation of the op_visit stream.
  describe("op_visit allocation", () => {
    function today(): string {
      const d = new Date();
      return (
        String(d.getFullYear()).slice(-2) +
        String(d.getMonth() + 1).padStart(2, "0") +
        String(d.getDate()).padStart(2, "0")
      );
    }

    it("composes op_visit numbers to the byte-exact format and increments per tenant", async () => {
      const cfg = { tenantNumericCode: "00042", identifierOverrides: {} };
      const first = await allocateIdentifier(db, {
        tenantId: TENANT_A,
        identifierType: "op_visit",
        counterSchema: "registration",
        ...cfg,
      });
      const second = await allocateIdentifier(db, {
        tenantId: TENANT_A,
        identifierType: "op_visit",
        counterSchema: "registration",
        ...cfg,
      });
      // Default op_visit segments: prefix "OP" + date YYMMDD + 7-digit sequence
      // (tenant_code disabled — the numeric code never appears).
      const day = today();
      expect(first).toBe(`OP${day}0000001`);
      expect(second).toBe(`OP${day}0000002`);
      // Different tenant restarts at 1 (counter PK is (iq_tenant_id, sequence_name)).
      const other = await allocateIdentifier(db, {
        tenantId: TENANT_B,
        identifierType: "op_visit",
        counterSchema: "registration",
        ...cfg,
      });
      expect(other).toBe(`OP${day}0000001`);
    });
  });
});
