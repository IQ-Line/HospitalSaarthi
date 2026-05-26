import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createDb } from "@hims/ts-sdk-db";
import { DrizzleAbdmSessionsRepo } from "../../data-access/abdm-sessions.repo.js";
import { DrizzleInboundMessagesRepo } from "../../data-access/abdm-inbound-messages.repo.js";
import {
  MockEmpiClient,
  MockRecordFoundationClient,
} from "../../data-access/mock-platform-clients.js";
import { FideliusEncryptor } from "../../data-access/fidelius.js";
import { LoggingSmsClient } from "../../data-access/sms-client.js";
import { EnvSecretsClient } from "../../data-access/env-secrets.client.js";
import { InMemoryLinkOtpStore } from "../../lib/link-otp-store.js";
import { HttpGatewayClient } from "../../data-access/gateway-client.http.js";
import type { AbdmAdapterDeps } from "../../ports.js";
import { handleDiscoverCallback } from "./user-initiated-link/handle-discover-callback.js";
import { handleLinkInitCallback } from "./user-initiated-link/handle-link-init-callback.js";
import { handleLinkConfirmCallback } from "./user-initiated-link/handle-link-confirm-callback.js";

import { resolveSandboxDatabaseUrl } from "../../test-utils/sandbox-env.js";

const RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1";
const DB_URL = resolveSandboxDatabaseUrl();

function buildDeps(): AbdmAdapterDeps {
  const db = createDb(DB_URL!);
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
  return {
    sessions: new DrizzleAbdmSessionsRepo(db),
    gateway,
    fidelius: new FideliusEncryptor(),
    secrets,
    inboundMessages: new DrizzleInboundMessagesRepo(db),
    linkTokens: {
      findFresh: async () => null,
      claimAcquisition: async () => "claimed" as const,
      completeAcquisition: async () => undefined,
      invalidate: async () => undefined,
    } as never,
    consentArtefacts: { upsert: async () => true, findById: async () => null } as never,
    empi: new MockEmpiClient(process.env["ABDM_MOCK_ABHA_ADDRESS"] ?? "test.user@sbx"),
    recordFoundation: new MockRecordFoundationClient(),
    payloadEncryptor: { encrypt: (s) => s, decrypt: (s) => s },
    linkOtpStore: new InMemoryLinkOtpStore(),
    sms: new LoggingSmsClient(),
    xHipId: process.env["ABDM_X_HIP_ID"] ?? "IN3610001625",
    xCmId: process.env["ABDM_X_CM_ID"] ?? "sbx",
  };
}

describe.skipIf(!RUN || !DB_URL)("M2 user-initiated link — in-process chain", () => {
  const tenantId =
    process.env["ABDM_SANDBOX_TEST_TENANT_ID"] ??
    process.env["ABDM_DEV_TENANT_ID"] ??
    "00000000-0000-4000-8000-0000000000aa";
  const abha = process.env["ABDM_MOCK_ABHA_ADDRESS"] ?? "test.user@sbx";

  it("runs discover → init → confirm with mocked EMPI/RF", async () => {
    const post = vi.fn().mockResolvedValue({});
    const deps = buildDeps();
    deps.gateway = { post } as never;

    const txnId = randomUUID();
    await handleDiscoverCallback(
      {
        iqTenantId: tenantId,
        inboundRequestId: randomUUID(),
        transactionId: txnId,
        patient: [{ id: abha }],
      },
      deps,
    );

    await handleLinkInitCallback(
      {
        iqTenantId: tenantId,
        inboundRequestId: randomUUID(),
        transactionId: txnId,
        link: {
          referenceNumber: randomUUID(),
          authenticationType: "DIRECT",
          meta: {
            communicationMedium: "MOBILE",
            communicationHint: "OTP",
            communicationExpiry: new Date(Date.now() + 600_000).toISOString(),
          },
        },
      },
      deps,
    );

    const afterInit = await deps.sessions.findUserLinkByTransactionId({
      iqTenantId: tenantId,
      transactionId: txnId,
    });
    const linkRefNumber = String(afterInit?.context.linkRefNumber ?? "");
    const otp = (deps.linkOtpStore as InMemoryLinkOtpStore).peekOtp(
      tenantId,
      linkRefNumber,
    );
    expect(otp).toBeTruthy();

    await handleLinkConfirmCallback(
      {
        iqTenantId: tenantId,
        inboundRequestId: randomUUID(),
        transactionId: txnId,
        confirmation: { token: otp!, linkRefNumber },
      },
      deps,
    );

    expect(post.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
