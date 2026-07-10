import { describe, expect, it, vi } from "vitest";
import { startConsentRequest } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/start-consent-request.js";
import { createDb } from "@hims/ts-sdk-db";
import { DrizzleAbdmSessionsRepo } from "../../../../../../src/integrations/abdm/data-access/abdm-sessions.repo.js";
import { DrizzleM3ConsentRequestsRepo } from "../../../../../../src/integrations/abdm/data-access/abdm-m3-consent-requests.repo.js";
import { DrizzleM3ConsentArtefactsHiuRepo } from "../../../../../../src/integrations/abdm/data-access/abdm-m3-consent-artefacts-hiu.repo.js";
import { DrizzleM3DataTransfersRepo } from "../../../../../../src/integrations/abdm/data-access/abdm-m3-data-transfers.repo.js";
import { EnvSecretsClient } from "../../../../../../src/integrations/abdm/data-access/env-secrets.client.js";
import { createFideliusEncryptorFromEnv } from "../../../../../../src/integrations/abdm/data-access/fidelius.js";
import { HttpGatewayClient } from "../../../../../../src/integrations/abdm/data-access/gateway-client.http.js";
import { createPayloadEncryptorFromEnv } from "../../../../../../src/integrations/abdm/lib/payload-encryptor.js";
import { M3Hiu } from "../../../../../../src/integrations/abdm/lib/m3-fsm-states.js";
import { resolveSandboxDatabaseUrl, hasLiveNhaSandboxEnv } from "../../../../../../src/integrations/abdm/test-utils/sandbox-env.js";

/**
 * Gated sandbox — real NHA gateway consent init.
 * RUN_ABDM_SANDBOX_TESTS=1 ABDM_RUN_LIVE_NHA_SANDBOX=1
 * (loads repo .env via vitest.sandbox.setup.ts)
 */
const RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1";
const DB_URL = resolveSandboxDatabaseUrl();

describe.skipIf(!RUN || !DB_URL || !hasLiveNhaSandboxEnv())("m3 HIU consent-request sandbox", () => {
  it("starts consent request against NHA sandbox", async () => {
    vi.stubEnv("ABDM_M3_MOCK_GATEWAY", "false");

    const db = createDb(DB_URL!);
    const secrets = new EnvSecretsClient();
    const gateway = new HttpGatewayClient({
      gatewayBaseUrl: process.env["ABDM_GATEWAY_BASE_URL"] ?? "https://dev.abdm.gov.in",
      abhaApiBaseUrl:
        process.env["ABDM_ABHA_API_BASE_URL"] ?? "https://abhasbx.abdm.gov.in/abha/api",
      xCmId: process.env["ABDM_X_CM_ID"] ?? "sbx",
      secrets,
    });

    const tenantId =
      process.env["ABDM_SANDBOX_TEST_TENANT_ID"] ??
      "00000000-0000-4000-8000-0000000000aa";
    const abhaAddress = process.env["ABDM_MOCK_ABHA_ADDRESS"] ?? "test.user@sbx";

    const deps = {
      sessions: new DrizzleAbdmSessionsRepo(db),
      gateway,
      fidelius: createFideliusEncryptorFromEnv(),
      secrets,
      m3ConsentRequests: new DrizzleM3ConsentRequestsRepo(db),
      m3ConsentArtefactsHiu: new DrizzleM3ConsentArtefactsHiuRepo(db),
      m3DataTransfers: new DrizzleM3DataTransfersRepo(db),
      payloadEncryptor: createPayloadEncryptorFromEnv(),
      xHiuId: process.env["ABDM_X_HIU_ID"] ?? "SBX_TEST_HIU_001",
    } as never;

    const out = await startConsentRequest(
      {
        iqTenantId: tenantId,
        patientAbhaAddress: abhaAddress,
        purpose: "CAREMGT",
        hiTypes: ["OPConsultation"],
        dateRange: {
          from: new Date(Date.now() - 30 * 86400000).toISOString(),
          to: new Date().toISOString(),
        },
      },
      deps,
    );

    expect(out.state).toBe(M3Hiu.CONSENT_INIT_REQUESTED);
    expect(out.sessionId.length).toBeGreaterThan(0);
  });
});
