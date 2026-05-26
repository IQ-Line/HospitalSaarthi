import { describe, expect, it } from "vitest";
import { createDb } from "@hims/ts-sdk-db";
import { DrizzleAbdmSessionsRepo } from "../../data-access/abdm-sessions.repo.js";
import { EnvSecretsClient } from "../../data-access/env-secrets.client.js";
import { FideliusEncryptor } from "../../data-access/fidelius.js";
import { HttpGatewayClient } from "../../data-access/gateway-client.http.js";
import { enrolAadhaarOtpRequest } from "./enrol-aadhaar-otp-request.js";
import { enrolAadhaarVerifyRequest } from "./enrol-aadhaar-verify-request.js";
import { enrolMobileVerifySendOtpRequest } from "./enrol-mobile-verify-send-otp-request.js";
import { enrolMobileVerifyConfirmOtpRequest } from "./enrol-mobile-verify-confirm-otp-request.js";

/**
 * Gated sandbox e2e for the Aadhaar enrol chain (NHA SBX).
 *
 * Run:
 *   pnpm -F @hims/ts-sdk-db build
 *   RUN_ABDM_SANDBOX_TESTS=1 \
 *   DATABASE_URL=postgresql://... \
 *   ABDM_SANDBOX_CLIENT_ID=... ABDM_SANDBOX_CLIENT_SECRET=... \
 *   ABDM_SANDBOX_TEST_AADHAAR=12digits \
 *   ABDM_SANDBOX_TEST_MOBILE=10digits \
 *   ABDM_SANDBOX_TEST_AADHAAR_OTP=6digits \
 *   ABDM_SANDBOX_TEST_MOBILE_OTP=6digits \
 *   pnpm -F @hims/abdm-adapter test:sandbox
 */

import { resolveSandboxDatabaseUrl, hasSandboxAadhaarEnv } from "../../test-utils/sandbox-env.js";

const RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1";
const DB_URL = resolveSandboxDatabaseUrl();

function buildDeps() {
  const databaseUrl = DB_URL!;
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
  const fidelius = new FideliusEncryptor();
  return { sessions, gateway, secrets, fidelius };
}

describe.skipIf(!RUN || !DB_URL || !hasSandboxAadhaarEnv())("M1 Aadhaar chain — ABDM sandbox", () => {
  const tenantId =
    process.env["ABDM_SANDBOX_TEST_TENANT_ID"] ??
    "00000000-0000-4000-8000-0000000000aa";

  it("runs aadhaar OTP → verify → mobile-verify when sandbox OTP env vars are set", async () => {
    const aadhaar = process.env["ABDM_SANDBOX_TEST_AADHAAR"] ?? "";
    const mobile = process.env["ABDM_SANDBOX_TEST_MOBILE"] ?? "";
    const aadhaarOtp = process.env["ABDM_SANDBOX_TEST_AADHAAR_OTP"] ?? "";
    const mobileOtp = process.env["ABDM_SANDBOX_TEST_MOBILE_OTP"] ?? "";

    if (!/^\d{12}$/.test(aadhaar)) {
      throw new Error("Set ABDM_SANDBOX_TEST_AADHAAR (12 digits)");
    }
    if (!/^\d{10}$/.test(mobile)) {
      throw new Error("Set ABDM_SANDBOX_TEST_MOBILE (10 digits)");
    }
    if (!/^\d{6}$/.test(aadhaarOtp)) {
      throw new Error("Set ABDM_SANDBOX_TEST_AADHAAR_OTP (6 digits) for full chain");
    }
    if (!/^\d{6}$/.test(mobileOtp)) {
      throw new Error("Set ABDM_SANDBOX_TEST_MOBILE_OTP (6 digits) for full chain");
    }

    const deps = buildDeps();

    const otpOut = await enrolAadhaarOtpRequest(
      { aadhaarNumber: aadhaar, iqTenantId: tenantId },
      deps,
    );
    expect(otpOut.txnId.length).toBeGreaterThan(0);

    const verifyOut = await enrolAadhaarVerifyRequest(
      {
        sessionId: otpOut.sessionId,
        otp: aadhaarOtp,
        mobile,
        iqTenantId: tenantId,
      },
      deps,
    );
    expect(verifyOut.txnId.length).toBeGreaterThan(0);

    const mobileSend = await enrolMobileVerifySendOtpRequest(
      {
        sessionId: otpOut.sessionId,
        mobile,
        iqTenantId: tenantId,
      },
      deps,
    );
    expect(mobileSend.txnId.length).toBeGreaterThan(0);

    const mobileConfirm = await enrolMobileVerifyConfirmOtpRequest(
      {
        sessionId: otpOut.sessionId,
        otp: mobileOtp,
        iqTenantId: tenantId,
      },
      deps,
    );
    expect(mobileConfirm.txnId.length).toBeGreaterThan(0);

    const session = await deps.sessions.findById({
      iqTenantId: tenantId,
      sessionId: otpOut.sessionId,
    });
    expect(session?.state).toBe("MOBILE_OTP_VERIFIED");
    expect(session?.xToken).toBeTruthy();
  });
});
