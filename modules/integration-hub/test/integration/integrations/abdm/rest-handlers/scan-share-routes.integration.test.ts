/**
 * Handler-level round-trip for the scan-and-share platform routes against a real
 * Postgres — proves route wiring + status/active/lookup/prefill/redeem shapes and
 * the used-token redemption guard end-to-end through the real Drizzle adapter SQL.
 *
 * Skipped unless SCAN_SHARE_TEST_DB_URL points at a Postgres with the
 * `integration_hub.abdm_share_token*` tables (see W5 throwaway `hims-w5-scanshare`,
 * port 5456). Not part of CI's default DB-less run.
 */

import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, sql } from "@hims/ts-sdk-db";
import { registerScanShareRoutes } from "../../../../../src/integrations/abdm/rest-handlers/scan-share.js";
import { DrizzleScanShareRepo } from "../../../../../src/integrations/abdm/data-access/abdm-scan-share.repo.js";
import type { IntegrationContext } from "../../../../../src/lib/integration-context.js";
import { endOfIstDay, istIssueDate } from "../../../../../src/integrations/abdm/use-cases/scan-share/time.js";

const DB_URL = process.env["SCAN_SHARE_TEST_DB_URL"];
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

describe.skipIf(!DB_URL)("scan-share platform routes (real DB)", () => {
  const db = createDb(DB_URL as string);
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

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE integration_hub.abdm_share_token_issuances, integration_hub.abdm_share_tokens`);
    app = await buildApp();
  });

  afterAll(async () => {
    await app?.close();
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
