import { describe, expect, it } from "vitest";
import { createDb } from "@hims/ts-sdk-db";
import { DrizzleAbdmSessionsRepo } from "../../data-access/abdm-sessions.repo.js";
import { EnvSecretsClient } from "../../data-access/env-secrets.client.js";
import { FideliusEncryptorStub } from "../../data-access/fidelius.js";
import { HttpGatewayClient } from "../../data-access/gateway-client.http.js";
import { enrolAadhaarOtpRequest } from "./enrol-aadhaar-otp-request.js";

/**
 * Excluded from default `nx run abdm-adapter:test` (see vitest.config.ts).
 * Run: `pnpm -F @hims/ts-sdk-db build` then
 * `RUN_ABDM_SANDBOX_TESTS=1 ABDM_SANDBOX_TEST_AADHAAR=... pnpm -F @hims/abdm-adapter test:sandbox`
 */

const RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1";

describe.skipIf(!RUN)("enrolAadhaarOtpRequest — ABDM sandbox (RUN_ABDM_SANDBOX_TESTS=1)", () => {
  it("dispatches OTP against NHA SBX (requires valid sandbox Aadhaar + env)", async () => {
    const databaseUrl = process.env["DATABASE_URL"];
    if (!databaseUrl) {
      throw new Error("DATABASE_URL required for sandbox integration test");
    }
    const secrets = new EnvSecretsClient();
    const gateway = new HttpGatewayClient({
      gatewayBaseUrl:
        process.env["ABDM_GATEWAY_BASE_URL"] ?? "https://dev.abdm.gov.in",
      abhaApiBaseUrl:
        process.env["ABDM_ABHA_API_BASE_URL"] ??
        "https://abhasbx.abdm.gov.in/abha/api",
      xCmId: process.env["ABDM_X_CM_ID"] ?? "sbx",
      secrets,
    });
    const db = createDb(databaseUrl);
    const sessions = new DrizzleAbdmSessionsRepo(db);
    const fidelius = new FideliusEncryptorStub();
    const deps = { sessions, gateway, secrets, fidelius };

    const aadhaar = process.env["ABDM_SANDBOX_TEST_AADHAAR"] ?? "";
    if (!/^\d{12}$/.test(aadhaar)) {
      throw new Error(
        "Set ABDM_SANDBOX_TEST_AADHAAR to a 12-digit sandbox Aadhaar for this test",
      );
    }

    const tenantId =
      process.env["ABDM_SANDBOX_TEST_TENANT_ID"] ??
      "00000000-0000-4000-8000-0000000000aa";

    const out = await enrolAadhaarOtpRequest(
      { aadhaarNumber: aadhaar, iqTenantId: tenantId },
      deps,
    );
    expect(out.txnId.length).toBeGreaterThan(0);
    expect(out.sessionId.length).toBeGreaterThan(0);
  });
});
