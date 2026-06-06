import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createDb } from "@hims/ts-sdk-db";
import { DrizzleAbdmSessionsRepo } from "../../data-access/abdm-sessions.repo.js";
import { DrizzleInboundMessagesRepo } from "../../data-access/abdm-inbound-messages.repo.js";
import { DrizzleConsentArtefactsRepo } from "../../data-access/abdm-consent-artefacts.repo.js";
import { MockEmpiClient } from "../../data-access/mock-platform-clients.js";
import { FideliusEncryptor } from "../../data-access/fidelius.js";
import { LoggingSmsClient } from "../../data-access/sms-client.js";
import { EnvSecretsClient } from "../../data-access/env-secrets.client.js";
import { InMemoryLinkOtpStore } from "../../lib/link-otp-store.js";
import { HttpGatewayClient } from "../../data-access/gateway-client.http.js";
import type { AbdmAdapterDeps } from "../../ports.js";
import { handleConsentNotifyCallback } from "./consent-notify/handle-consent-notify-callback.js";

import { resolveSandboxDatabaseUrl } from "../../test-utils/sandbox-env.js";

const RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1";
const DB_URL = resolveSandboxDatabaseUrl();

function buildDeps(post: ReturnType<typeof vi.fn>): AbdmAdapterDeps {
  const db = createDb(DB_URL!);
  const secrets = new EnvSecretsClient();
  return {
    sessions: new DrizzleAbdmSessionsRepo(db),
    gateway: { post } as never,
    fidelius: new FideliusEncryptor(),
    secrets,
    inboundMessages: new DrizzleInboundMessagesRepo(db),
    linkTokens: {} as never,
    consentArtefacts: new DrizzleConsentArtefactsRepo(db),
    empi: new MockEmpiClient(),
    recordFoundation: {
      registerUnlinkedCareContexts: async () => undefined,
      listUnlinkedCareContexts: async () => [],
      markCareContextLinked: async () => undefined,
      fetchBundlesForConsent: async () => [],
    },
    payloadEncryptor: { encrypt: (s) => s, decrypt: (s) => s },
    linkOtpStore: new InMemoryLinkOtpStore(),
    sms: new LoggingSmsClient(),
    xHipId: process.env["ABDM_X_HIP_ID"] ?? "IN3610001625",
    xCmId: "sbx",
  };
}

describe.skipIf(!RUN || !DB_URL)("M2 consent notify", () => {
  const tenantId =
    process.env["ABDM_DEV_TENANT_ID"] ?? "00000000-0000-4000-8000-0000000000aa";

  it("persists consent artefact and posts on-notify ack", async () => {
    vi.stubEnv("ABDM_DEV_INBOUND_SIMULATION", "false");

    const post = vi.fn().mockResolvedValue({});
    const deps = buildDeps(post);
    const consentId = randomUUID();
    const requestId = randomUUID();

    await handleConsentNotifyCallback(
      {
        iqTenantId: tenantId,
        inboundRequestId: requestId,
        notification: {
          status: "GRANTED",
          consentId,
          signature: "stub-sig",
          grantAcknowledgement: true,
          consentDetail: {
            schemaVersion: "v1",
            consentId,
            createdAt: new Date().toISOString(),
            patient: { id: "test.user@sbx" },
            hip: { id: deps.xHipId },
            hiu: { id: "hiu-1" },
            purpose: { text: "care", code: "CAREMGT", refUri: "http://example" },
            hiTypes: ["OPConsultation"],
            permission: {
              accessMode: "VIEW",
              dateRange: { from: "2020-01-01", to: "2025-01-01" },
              dataEraseAt: "2030-01-01T00:00:00.000Z",
              frequency: { unit: "HOUR", value: 1, repeats: 0 },
            },
          },
        },
      },
      deps,
    );

    expect(post).toHaveBeenCalled();
    const row = await deps.consentArtefacts.findById(tenantId, consentId);
    expect(row?.consentId).toBe(consentId);
  });
});
