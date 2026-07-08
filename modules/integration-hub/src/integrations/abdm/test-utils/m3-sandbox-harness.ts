import { randomUUID } from "node:crypto";
import { createDb } from "@hims/ts-sdk-db";
import { DrizzleAbdmSessionsRepo } from "../data-access/abdm-sessions.repo.js";
import { DrizzleInboundMessagesRepo } from "../data-access/abdm-inbound-messages.repo.js";
import { DrizzleConsentArtefactsRepo } from "../data-access/abdm-consent-artefacts.repo.js";
import { DrizzleM3ConsentRequestsRepo } from "../data-access/abdm-m3-consent-requests.repo.js";
import { DrizzleM3ConsentArtefactsHiuRepo } from "../data-access/abdm-m3-consent-artefacts-hiu.repo.js";
import { DrizzleM3DataTransfersRepo } from "../data-access/abdm-m3-data-transfers.repo.js";
import { DrizzleLinkTokensRepo } from "../data-access/abdm-link-tokens.repo.js";
import { DrizzleCareContextLinkStateRepo } from "../data-access/abdm-care-context-link-state.repo.js";
import {
  MockEmpiClient,
  MockRecordFoundationClient,
} from "../data-access/mock-platform-clients.js";
import { createFideliusEncryptorFromEnv } from "../data-access/fidelius.js";
import { createPayloadEncryptorFromEnv } from "../lib/payload-encryptor.js";
import { LoggingSmsClient } from "../data-access/sms-client.js";
import { EnvSecretsClient } from "../data-access/env-secrets.client.js";
import { NoOpRegistrationClient } from "../data-access/registration-client.http.js";
import { InMemoryLinkOtpStore } from "../lib/link-otp-store.js";
import type { AbdmAdapterDeps } from "../ports.js";
import type { AbdmSession } from "../domain/session.js";
import type { M3ConsentRequestRow, M3DataTransferRow } from "../ports.js";
import { startConsentRequest } from "../use-cases/m3/hiu/start-consent-request.js";
import { handleOnInitCallback } from "../use-cases/m3/hiu/handle-on-init-callback.js";
import { handleNotifyCallback } from "../use-cases/m3/hiu/handle-notify-callback.js";
import { handleOnFetchCallback } from "../use-cases/m3/hiu/handle-on-fetch-callback.js";
import { M3Hiu } from "../lib/m3-fsm-states.js";

export const M3_SANDBOX_TENANT =
  process.env["ABDM_SANDBOX_TEST_TENANT_ID"] ??
  process.env["ABDM_DEV_TENANT_ID"] ??
  "00000000-0000-4000-8000-0000000000aa";

export const M3_SANDBOX_ABHA =
  process.env["ABDM_MOCK_ABHA_ADDRESS"] ?? "test.user@sbx";

export interface M3ConsentGrantedFixture {
  deps: AbdmAdapterDeps;
  consentId: string;
  session: AbdmSession;
  consentRow: M3ConsentRequestRow;
}

export function buildM3SandboxDeps(databaseUrl: string): AbdmAdapterDeps {
  const db = createDb(databaseUrl);
  const secrets = new EnvSecretsClient();
  return {
    sessions: new DrizzleAbdmSessionsRepo(db),
    gateway: { post: async () => ({}), get: async () => ({}), getPublicCertificate: async () => "", getDiagnosticsSnapshot: async () => ({}) } as never,
    fidelius: createFideliusEncryptorFromEnv(),
    secrets,
    inboundMessages: new DrizzleInboundMessagesRepo(db),
    linkTokens: new DrizzleLinkTokensRepo(db),
    consentArtefacts: new DrizzleConsentArtefactsRepo(db),
    empi: new MockEmpiClient(M3_SANDBOX_ABHA),
    registration: new NoOpRegistrationClient(),
    recordFoundation: new MockRecordFoundationClient(
      process.env["ABDM_MOCK_ABHA_ADDRESS"] ?? "test.user@sbx",
    ),
    careContextLinkState: new DrizzleCareContextLinkStateRepo(db),
    payloadEncryptor: createPayloadEncryptorFromEnv(),
    linkOtpStore: new InMemoryLinkOtpStore(),
    sms: new LoggingSmsClient(),
    m3ConsentRequests: new DrizzleM3ConsentRequestsRepo(db),
    m3ConsentArtefactsHiu: new DrizzleM3ConsentArtefactsHiuRepo(db),
    m3DataTransfers: new DrizzleM3DataTransfersRepo(db),
    xHipId: process.env["ABDM_X_HIP_ID"] ?? "IN3610001625",
    xHiuId: process.env["ABDM_X_HIU_ID"] ?? "IN3610001625",
    xCmId: process.env["ABDM_X_CM_ID"] ?? "sbx",
  };
}

/** Runs HIU consent sub-flow through CONSENT_GRANTED (mock gateway, real DB repos). */
export async function runM3ConsentGrantedFixture(
  deps: AbdmAdapterDeps,
  iqTenantId: string = M3_SANDBOX_TENANT,
): Promise<M3ConsentGrantedFixture> {
  const consentId = `CON-SBX-${randomUUID()}`;
  const now = new Date();
  const dateRange = {
    from: new Date(now.getTime() - 90 * 86400000).toISOString(),
    to: now.toISOString(),
  };

  const start = await startConsentRequest(
    {
      iqTenantId,
      patientAbhaAddress: M3_SANDBOX_ABHA,
      purpose: "CAREMGT",
      hiTypes: ["OPConsultation"],
      dateRange,
    },
    deps,
  );

  const session = await deps.sessions.findById({
    iqTenantId,
    sessionId: start.sessionId,
  });
  if (!session) throw new Error("consent session missing after start");

  const consentRow = await deps.m3ConsentRequests.findBySessionId({
    iqTenantId,
    sessionId: start.sessionId,
  });
  if (!consentRow) throw new Error("consent request row missing");

  const cmRequestId = consentRow.consentRequestId;

  await handleOnInitCallback(
    {
      iqTenantId,
      inboundRequestId: randomUUID(),
      consentRequest: { id: cmRequestId },
      response: { requestId: randomUUID() },
    },
    deps,
  );

  await handleNotifyCallback(
    {
      iqTenantId,
      inboundRequestId: randomUUID(),
      notification: {
        consentRequestId: cmRequestId,
        status: "GRANTED",
        consentArtefacts: [{ id: consentId }],
      },
    },
    deps,
  );

  await handleOnFetchCallback(
    {
      iqTenantId,
      inboundRequestId: randomUUID(),
      response: { requestId: randomUUID() },
      consent: {
        status: "GRANTED",
        signature: "sandbox-signature",
        consentDetail: {
          consentId,
          schemaVersion: "v3",
          createdAt: now.toISOString(),
          lastUpdated: now.toISOString(),
          patient: { id: M3_SANDBOX_ABHA },
          hip: { id: deps.xHipId },
          hiu: { id: deps.xHiuId },
          hiTypes: ["OPConsultation"],
          careContexts: [
            { patientReference: M3_SANDBOX_ABHA, careContextReference: "VISIT-MOCK-001" },
          ],
          purpose: { text: "Care", code: "CAREMGT", refUri: "www.abdm.gov.in" },
          permission: {
            accessMode: "VIEW",
            dateRange,
            dataEraseAt: new Date(now.getTime() + 90 * 86400000).toISOString(),
            frequency: { unit: "HOUR", value: 1, repeats: 0 },
          },
        },
      },
    },
    deps,
  );

  const updatedSession = await deps.sessions.findById({
    iqTenantId,
    sessionId: start.sessionId,
  });
  if (!updatedSession || updatedSession.state !== M3Hiu.CONSENT_GRANTED) {
    throw new Error(`expected CONSENT_GRANTED, got ${updatedSession?.state}`);
  }

  const updatedRow = await deps.m3ConsentRequests.findBySessionId({
    iqTenantId,
    sessionId: start.sessionId,
  });
  if (!updatedRow) throw new Error("consent row missing after grant");

  return {
    deps,
    consentId,
    session: updatedSession,
    consentRow: updatedRow,
  };
}

export type { M3DataTransferRow };
