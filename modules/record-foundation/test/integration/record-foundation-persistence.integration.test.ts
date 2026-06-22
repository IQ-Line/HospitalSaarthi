import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyRecordFoundationSchemaMigration } from "../../src/schema/apply-migration.js";
import { DrizzleCareContextRepo } from "../../src/data-access/drizzle-care-contexts.repo.js";
import { DrizzleBundleRepo } from "../../src/data-access/drizzle-bundles.repo.js";
import { registerCareContextHandlers } from "../../src/rest-handlers/care-contexts.js";
import { registerBundleHandlers } from "../../src/rest-handlers/bundles.js";

// ---------------------------------------------------------------------------
// Real-Postgres handler+repo coverage (vet 2026-06-22, record-foundation P1–P4):
// proves tenant isolation, the uq_care_contexts_source idempotency (incl. the
// NULL hole), the bundles->care_contexts FK pre-check (404 not 500), a correct
// COUNT(*), pagination, and the RFC7807 envelopes — none of which the mocked
// use-case unit tests could verify. Opt-in via TEST_DATABASE_URL (Citus :5444).
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT_A = "a0000000-0000-4000-8000-00000000000a";
const TENANT_B = "b0000000-0000-4000-8000-00000000000b";
const PATIENT = "d0000000-0000-4000-8000-0000000000d1";

function careContextBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    patient_id: PATIENT,
    source_origin: "platform_module",
    source_system_id: "opd",
    source_record_type: "opd_visit",
    display: "OPD Visit",
    period_start: "2026-03-12T10:00:00.000Z",
    ...over,
  };
}

describeDb("record-foundation persistence (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let app: FastifyInstance;

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS record_foundation CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyRecordFoundationSchemaMigration(url);
    db = createDb(url);

    const careContextRepo = new DrizzleCareContextRepo(db);
    const bundleRepo = new DrizzleBundleRepo(db);

    app = Fastify({ ajv: { customOptions: { coerceTypes: true } } });
    app.decorateRequest("tenantId", "");
    app.addHook("preHandler", async (request) => {
      request.tenantId = (request.headers["x-tenant-id"] as string) ?? "";
    });
    registerCareContextHandlers(app, { careContextRepo });
    registerBundleHandlers(app, { careContextRepo, bundleRepo });
    await app.ready();
  }, 60_000);

  beforeEach(async () => {
    await pool.query("TRUNCATE record_foundation.bundles CASCADE");
    await pool.query("TRUNCATE record_foundation.care_contexts CASCADE");
  });

  afterAll(async () => {
    await app.close();
    await pool.query("DROP SCHEMA IF EXISTS record_foundation CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  const post = (url: string, payload: unknown, tenant = TENANT_A) =>
    app.inject({ method: "POST", url, payload, headers: { "x-tenant-id": tenant } });
  const get = (url: string, tenant = TENANT_A) =>
    app.inject({ method: "GET", url, headers: { "x-tenant-id": tenant } });

  it("POST /care-contexts is idempotent on the source tuple (201 then 200, same id)", async () => {
    const body = careContextBody({ source_record_id: "visit-1" });
    const first = await post("/care-contexts", body);
    expect(first.statusCode).toBe(201);
    const id = JSON.parse(first.body).data.id;

    const second = await post("/care-contexts", body);
    expect(second.statusCode).toBe(200); // idempotent replay
    expect(JSON.parse(second.body).data.id).toBe(id);

    // Exactly one row persisted.
    const { rows } = await pool.query(
      "SELECT count(*)::int AS c FROM record_foundation.care_contexts WHERE iq_tenant_id = $1",
      [TENANT_A],
    );
    expect(rows[0].c).toBe(1);
  });

  it("idempotency survives whitespace-padded source_record_id (stored == refetch key)", async () => {
    const body = careContextBody({ source_record_id: "  pad-1  " });
    const first = await post("/care-contexts", body);
    expect(first.statusCode).toBe(201);
    const id = JSON.parse(first.body).data.id;

    const second = await post("/care-contexts", body);
    expect(second.statusCode).toBe(200); // must NOT be a 500 from a trim mismatch
    expect(JSON.parse(second.body).data.id).toBe(id);
  });

  it("NULL source_record_id never deduplicates — each POST creates a fresh row", async () => {
    const a = await post("/care-contexts", careContextBody());
    const b = await post("/care-contexts", careContextBody());
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
    expect(JSON.parse(a.body).data.id).not.toBe(JSON.parse(b.body).data.id);
  });

  it("is tenant-scoped: tenant B cannot read tenant A's care context", async () => {
    const created = await post("/care-contexts", careContextBody({ source_record_id: "iso-1" }));
    const id = JSON.parse(created.body).data.id;

    const crossGet = await get(`/care-contexts/${id}`, TENANT_B);
    expect(crossGet.statusCode).toBe(404);
    expect(JSON.parse(crossGet.body)).toMatchObject({ status: 404, title: "Not Found" });

    const crossList = await get("/care-contexts", TENANT_B);
    expect(JSON.parse(crossList.body).total).toBe(0);
  });

  it("POST /bundles returns 404 (not 500) when the care context is missing", async () => {
    const res = await post("/bundles", {
      care_context_id: "f0000000-0000-4000-8000-0000000000ff",
      bundle_kind: "OPConsultation",
      fhir_profile_url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
      fhir_profile_version: "1.0.0",
      bundle_json: { resourceType: "Bundle" },
      produced_at: "2026-03-12T10:00:00.000Z",
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toMatchObject({ status: 404, detail: "Care context not found" });
  });

  it("stores a bundle against an existing care context and lists it back", async () => {
    const cc = await post("/care-contexts", careContextBody({ source_record_id: "bdl-1" }));
    const careContextId = JSON.parse(cc.body).data.id;

    const stored = await post("/bundles", {
      care_context_id: careContextId,
      bundle_kind: "OPConsultation",
      fhir_profile_url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
      fhir_profile_version: "1.0.0",
      bundle_json: { resourceType: "Bundle", id: "b1" },
      produced_at: "2026-03-12T10:00:00.000Z",
    });
    expect(stored.statusCode).toBe(201);
    const bundleId = JSON.parse(stored.body).data.id;

    const fetched = await get(`/bundles/${bundleId}`);
    expect(fetched.statusCode).toBe(200);

    const list = await get(`/care-contexts/${careContextId}/bundles`);
    expect(JSON.parse(list.body).data).toHaveLength(1);
  });

  it("list returns a correct COUNT(*) and honors limit", async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await post("/care-contexts", careContextBody());
      expect(res.statusCode).toBe(201);
    }
    const all = await get("/care-contexts");
    expect(JSON.parse(all.body).total).toBe(3);

    const page = await get("/care-contexts?limit=2");
    const body = JSON.parse(page.body);
    expect(body.total).toBe(3); // total is the full count, not the page size
    expect(body.data).toHaveLength(2);
  });
});
