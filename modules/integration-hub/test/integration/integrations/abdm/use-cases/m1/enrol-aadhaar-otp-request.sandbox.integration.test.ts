import { describe, expect, it } from "vitest";
import { createDb } from "@hims/ts-sdk-db";
import { DrizzleAbdmSessionsRepo } from "../../../../../../src/integrations/abdm/data-access/abdm-sessions.repo.js";
import { EnvSecretsClient } from "../../../../../../src/integrations/abdm/data-access/env-secrets.client.js";
import { FideliusEncryptor } from "../../../../../../src/integrations/abdm/data-access/fidelius.js";
import { HttpGatewayClient } from "../../../../../../src/integrations/abdm/data-access/gateway-client.http.js";
import { buildM3SandboxDeps } from "../../../../../../src/integrations/abdm/test-utils/m3-sandbox-harness.js";
import type { AbdmAdapterDeps } from "../../../../../../src/integrations/abdm/ports.js";
import { enrolAadhaarOtpRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/enrol-aadhaar-otp-request.js";

/**
 * Excluded from default `nx run integration-hub:test` (see vitest.config.ts).
 * Run: `pnpm -F @hims/ts-sdk-db build` then
 * `RUN_ABDM_SANDBOX_TESTS=1 ABDM_SANDBOX_TEST_AADHAAR=...` and `cd modules/integration-hub && pnpm test:sandbox`
 */

import { resolveSandboxDatabaseUrl, hasSandboxAadhaarEnv } from "../../../../../../src/integrations/abdm/test-utils/sandbox-env.js";

const RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1";
const DB_URL = resolveSandboxDatabaseUrl();

describe.skipIf(!RUN || !DB_URL || !hasSandboxAadhaarEnv())(
  "enrolAadhaarOtpRequest — ABDM sandbox (RUN_ABDM_SANDBOX_TESTS=1)",
  () => {
  it("dispatches OTP against NHA SBX (requires valid sandbox Aadhaar + env)", async () => {
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
    const deps: AbdmAdapterDeps = {
      ...buildM3SandboxDeps(databaseUrl),
      sessions,
      gateway,
      secrets,
      fidelius,
    };

    const aadhaar = process.env["ABDM_SANDBOX_TEST_AADHAAR"]!;

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
