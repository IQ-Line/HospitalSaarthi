/**
 * Handler-level round-trip for the scan-and-share platform routes against a real
 * Postgres — proves route wiring + status/active/lookup/prefill/redeem shapes and
 * the used-token redemption guard end-to-end through the real Drizzle adapter SQL.
 *
 * Repo-standard integration gating: opt-in via TEST_DATABASE_URL (the
 * `test:integration` target injects
 * `${TEST_DATABASE_BASE_URL:-postgresql://hims:hims@127.0.0.1:5432}/hims_test_integration_hub`);
 * skips in the DB-less unit `test` run. Schema is applied from the module's own
 * drizzle-kit journal in beforeAll, exactly like registration/billing.
 */

import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool, type DbInstance } from "@hims/ts-sdk-db";
import { applyIntegrationHubSchemaMigration } from "../../../../../src/schema/apply-migration.js";
import { registerScanShareRoutes } from "../../../../../src/integrations/abdm/rest-handlers/scan-share.js";
import { DrizzleScanShareRepo } from "../../../../../src/integrations/abdm/data-access/abdm-scan-share.repo.js";
import type { IntegrationContext } from "../../../../../src/lib/integration-context.js";
import { endOfIstDay, istIssueDate } from "../../../../../src/integrations/abdm/use-cases/scan-share/time.js";

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const TENANT = "00000000-0000-4000-8000-0000000000aa";
const FACILITY = "IN-HIP-1";
const INTEGRATION_ID = "11111111-1111-4111-8111-111111111111";

function profileCtx(): IntegrationContext {
  return {
    iqTenantId: TENANT,
    profile: {
      id: INTEGRATION_ID,
      iqTenantId: TENANT,
      integrationKind: "abdm",
      hipId: FACILITY,
      hiuId: FACILITY,
      cmId: "sbx",
      clientId: null,
      clientSecret: null,
      defaultSmsPhone: null,
      hipDisplayName: "W5 Clinic",
      callbackBaseUrl: null,
      smsProvider: null,
      smsConfig: {},
      gatewayEnvironment: "sandbox",
    },
    deps: { xHipId: FACILITY } as IntegrationContext["deps"],
  };
}

describeDb("scan-share platform routes (real DB)", () => {
  const url = TEST_DATABASE_URL as string;
  let pool: ReturnType<typeof createPool>;
  let db: DbInstance;
  let app: FastifyInstance;

  async function buildApp(): Promise<FastifyInstance> {
    const instance = Fastify();
    instance.decorate("integrationHubSharedInfra", { db } as never);
    instance.addHook("preHandler", async (req) => {
      req.integrationCtx = profileCtx();
    });
    await registerScanShareRoutes(instance);
    await instance.ready();
    return instance;
  }

  async function seedToken(abhaAddress: string, profile: Record<string, unknown>): Promise<number> {
    const now = new Date();
    const issued = await new DrizzleScanShareRepo(db).allocateToken({
      iqTenantId: TENANT,
      integrationId: INTEGRATION_ID,
      facilityIdRef: FACILITY,
      abhaAddress,
      profile,
      patientId: null,
      issueDate: istIssueDate(now),
      expiresAt: endOfIstDay(now),
    });
    return issued.token_number;
  }

  beforeAll(async () => {
    pool = createPool(url);
    await pool.query("DROP SCHEMA IF EXISTS integration_hub CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await applyIntegrationHubSchemaMigration(url);
    db = createDb(url);
    app = await buildApp();
  }, 60_000);

  beforeEach(async () => {
    // Per-statement DELETE (not TRUNCATE) — a multi-table TRUNCATE over Citus
    // distributed tables runs a slow multi-shard 2PC that can straddle the
    // default 10s hook timeout (see registration's integration suite). No FK
    // between the two tables, so order is free.
    await pool.query("DELETE FROM integration_hub.abdm_share_token_issuances");
    await pool.query("DELETE FROM integration_hub.abdm_share_tokens");
  });

  afterAll(async () => {
    await app?.close();
    await pool.query("DROP SCHEMA IF EXISTS integration_hub CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.end();
  });

  it("GET /scan-share/status reports available with a QR", async () => {
    const res = await app.inject({ method: "GET", url: "/scan-share/status" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ available: true, hip_id: FACILITY, is_live: false });
  });

  it("round-trips a seeded token through active → lookup → prefill → redeem", async () => {
    const token = await seedToken("walkin@sbx", { name: "Asha Rani", abhaNumber: "12-3456-7890-1234" });

    const active = await app.inject({ method: "GET", url: "/scan-share/active" });
    expect(active.statusCode).toBe(200);
    expect(active.json().data.running_token).toBe(token);
    expect(active.json().data.patients).toHaveLength(1);

    const lookup = await app.inject({ method: "GET", url: `/scan-share/lookup?q=walkin` });
    expect(lookup.statusCode).toBe(200);
    expect(lookup.json().data).toMatchObject({ token_number: token, freeze_abha: true });

    const prefill = await app.inject({ method: "GET", url: `/scan-share/token/${token}/prefill` });
    expect(prefill.statusCode).toBe(200);
    expect(prefill.json().data.summary.patient_name).toBe("Asha Rani");

    const redeem = await app.inject({ method: "PUT", url: `/scan-share/token/${token}/redeem` });
    expect(redeem.statusCode).toBe(200);
    expect(redeem.json().data).toEqual({ token_number: token, redeemed: true });
  });

  it("MUTATION GUARD: redeeming an already-used token returns 404", async () => {
    const token = await seedToken("used@sbx", {});
    const first = await app.inject({ method: "PUT", url: `/scan-share/token/${token}/redeem` });
    expect(first.statusCode).toBe(200);

    // Second redeem hits the SQL guard (active=true AND redeemed_at IS NULL) → no row → 404.
    const second = await app.inject({ method: "PUT", url: `/scan-share/token/${token}/redeem` });
    expect(second.statusCode).toBe(404);
    expect(second.json()).toMatchObject({ error: "NotFound" });

    // A redeemed token is gone from the active queue.
    const active = await app.inject({ method: "GET", url: "/scan-share/active" });
    expect(active.json().data.patients).toHaveLength(0);
  });

  it("lookup/prefill/redeem 404 for unknown tokens; lookup 400 without q", async () => {
    expect((await app.inject({ method: "GET", url: "/scan-share/lookup?q=ghost" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/scan-share/lookup" })).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: "/scan-share/token/999/prefill" })).statusCode).toBe(404);
    expect((await app.inject({ method: "PUT", url: "/scan-share/token/999/redeem" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/scan-share/token/abc/prefill" })).statusCode).toBe(400);
  });
});
