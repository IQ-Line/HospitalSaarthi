import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createFideliusEncryptorFromEnv } from "../../../../../../src/integrations/abdm/data-access/fidelius.js";
import { buildMockAbdmDeps } from "../../../../../../src/integrations/abdm/test-utils/mock-deps.js";
import { startConsentRequest } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/start-consent-request.js";
import { handleOnInitCallback } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/handle-on-init-callback.js";
import { handleNotifyCallback } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/handle-notify-callback.js";
import { handleOnFetchCallback } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/handle-on-fetch-callback.js";
import { ensureDataRequestForConsent } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/start-data-request.js";
import { handleOnDataRequestCallback } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/handle-on-data-request-callback.js";
import { handleBundlePush } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/handle-bundle-push.js";
import { M3Hiu } from "../../../../../../src/integrations/abdm/lib/m3-fsm-states.js";
import type { AbdmSession } from "../../../../../../src/integrations/abdm/domain/session.js";
import type {
  M3ConsentRequestRow,
  M3DataTransferRow,
  M3DataTransfersPort,
} from "../../../../../../src/integrations/abdm/ports.js";

const TENANT = "00000000-0000-4000-8000-0000000000aa";

describe("m3 HIU mock loop (in-process)", () => {
  beforeEach(() => {
    vi.stubEnv("ABDM_M3_MOCK_GATEWAY", "true");
    vi.stubEnv("ABDM_ADAPTER_PUBLIC_BASE_URL", "http://localhost:3007");
  });

  it("runs consent → data-request → bundle push to ACKNOWLEDGED", async () => {
    const fidelius = createFideliusEncryptorFromEnv();
    const payload = JSON.stringify({ resourceType: "Bundle", id: "m3-loop" });

    let session: AbdmSession | null = null;
    let consentRow: M3ConsentRequestRow | null = null;
    let transferRow: M3DataTransferRow | null = null;
    const consentId = `CON-TEST-${randomUUID()}`;

    const sessions = {
      create: vi.fn(async (input) => {
        session = {
          iqTenantId: input.iqTenantId,
          sessionId: randomUUID(),
          flowKind: "abdm.m3.hiu.v1",
          state: "INIT",
          txnId: null,
          requestId: null,
          xToken: null,
          tToken: null,
          context: input.initialContext ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return session;
      }),
      findById: vi.fn(async () => session),
      patch: vi.fn(async (input) => {
        if (!session) throw new Error("no session");
        session = {
          ...session,
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
          context: { ...session.context, ...(input.contextMerge ?? {}) },
          updatedAt: new Date(),
        };
        return session;
      }),
    };

    const m3ConsentRequests = {
      insert: vi.fn(async (input) => {
        consentRow = {
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
      findByConsentRequestId: vi.fn(async () => consentRow),
      findBySessionId: vi.fn(async () => consentRow),
      patch: vi.fn(async (input) => {
        if (!consentRow) return;
        consentRow = {
          ...consentRow,
          ...(input.state ? { state: input.state } : {}),
          ...(input.consentArtefactIds ? { consentArtefactIds: input.consentArtefactIds } : {}),
          updatedAt: new Date(),
        };
      }),
      listActive: vi.fn(async () => (consentRow ? [consentRow] : [])),
      janitor: vi.fn(async () => 0),
    };

    const artefactStore = new Map<string, Record<string, unknown>>();

    const m3ConsentArtefactsHiu = {
      upsert: vi.fn(async (input) => {
        artefactStore.set(input.consentId, input);
      }),
      findById: vi.fn(async (_t, id) => {
        const row = artefactStore.get(id);
        return row ? (row as never) : null;
      }),
      listForRequest: vi.fn(async () => []),
    };

    // Typed against the port so a future port addition fails the compile
    // instead of silently no-oping behind production's fire-and-forget catch.
    const m3DataTransfers: M3DataTransfersPort = {
      insert: vi.fn(async (input) => {
        transferRow = {
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
      findById: vi.fn(async (_t, id) =>
        transferRow && transferRow.transferId === id ? transferRow : null,
      ),
      findByTransferId: vi.fn(async (id) =>
        transferRow && transferRow.transferId === id ? transferRow : null,
      ),
      findByOutboundRequestId: vi.fn(async (input) =>
        transferRow && transferRow.outboundRequestId === input.outboundRequestId
          ? transferRow
          : null,
      ),
      findLatestActiveByConsentId: vi.fn(async () => null),
      findLatestByConsentId: vi.fn(async (iqTenantId, id) =>
        transferRow &&
        transferRow.iqTenantId === iqTenantId &&
        transferRow.consentId === id
          ? transferRow
          : null,
      ),
      patch: vi.fn(async (input) => {
        if (!transferRow) return;
        transferRow = { ...transferRow, ...input, updatedAt: new Date() };
      }),
      patchWithSession: vi.fn(async (input) => {
        if (!transferRow) return;
        transferRow = {
          ...transferRow,
          ...input.transfer,
          updatedAt: new Date(),
        };
        if (input.session && session) {
          session = {
            ...session,
            ...(input.session.state ? { state: input.session.state } : {}),
            context: { ...session.context, ...(input.session.contextMerge ?? {}) },
          };
        }
      }),
      janitor: vi.fn(async () => 0),
    };

    const deps = buildMockAbdmDeps({
      sessions: sessions as never,
      fidelius,
      m3ConsentRequests: m3ConsentRequests as never,
      m3ConsentArtefactsHiu: m3ConsentArtefactsHiu as never,
      m3DataTransfers,
      gateway: { post: vi.fn(), get: vi.fn(), getPublicCertificate: vi.fn(), getDiagnosticsSnapshot: vi.fn() } as never,
    });

    const start = await startConsentRequest(
      {
        iqTenantId: TENANT,
        patientAbhaAddress: "test.user@sbx",
        purpose: "CAREMGT",
        hiTypes: ["OPConsultation"],
        dateRange: { from: "2025-01-01T00:00:00Z", to: "2026-05-21T00:00:00Z" },
      },
      deps,
    );
    expect(start.state).toBe(M3Hiu.CONSENT_INIT_REQUESTED);

    const cmRequestId = consentRow!.consentRequestId;
    await handleOnInitCallback(
      {
        iqTenantId: TENANT,
        inboundRequestId: randomUUID(),
        consentRequest: { id: cmRequestId },
        response: { requestId: randomUUID() },
      },
      deps,
    );
    expect(session!.state).toBe(M3Hiu.AWAITING_PATIENT_APPROVAL);

    await handleNotifyCallback(
      {
        iqTenantId: TENANT,
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
        iqTenantId: TENANT,
        inboundRequestId: randomUUID(),
        consent: {
          status: "GRANTED",
          signature: "mock-signature",
          consentDetail: {
            consentId,
            schemaVersion: "v3",
            createdAt: new Date().toISOString(),
            patient: { id: "test.user@sbx" },
            hip: { id: "HIP-1", name: "Test HIP" },
            hiu: { id: deps.xHiuId },
            hiTypes: ["OPConsultation"],
            careContexts: [{ patientReference: "p1", careContextReference: "cc1" }],
            purpose: { text: "Care", code: "CAREMGT", refUri: "www.abdm.gov.in" },
            permission: {
              accessMode: "VIEW",
              dateRange: { from: "2025-01-01T00:00:00Z", to: "2026-05-21T00:00:00Z" },
              dataEraseAt: "2027-01-01T00:00:00Z",
              frequency: { unit: "HOUR", value: 1, repeats: 0 },
            },
          },
        },
      },
      deps,
    );
    // Consent request reached CONSENT_GRANTED …
    expect(consentRow!.state).toBe(M3Hiu.CONSENT_GRANTED);
    // … and the GRANTED on-fetch AUTO-fired the data request (legacy-parity
    // path inside handleOnFetchCallback), moving the session forward.
    expect(m3DataTransfers.insert).toHaveBeenCalledTimes(1);
    expect(transferRow!.consentId).toBe(consentId);
    expect(transferRow!.state).toBe(M3Hiu.DATA_REQUESTED);
    expect(session!.state).toBe(M3Hiu.DATA_REQUESTED);

    // Idempotence: the in-flight transfer means ensure does not double-fire.
    const second = await ensureDataRequestForConsent(
      { iqTenantId: TENANT, consentId },
      deps,
    );
    expect(second).toBeNull();
    expect(m3DataTransfers.insert).toHaveBeenCalledTimes(1);

    await handleOnDataRequestCallback(
      {
        iqTenantId: TENANT,
        inboundRequestId: randomUUID(),
        response: { requestId: transferRow!.outboundRequestId! },
        hiRequest: { transactionId: `TXN-${randomUUID()}` },
      },
      deps,
    );
    expect(transferRow!.state).toBe(M3Hiu.AWAITING_PUSH);

    const hipEncrypt = await fidelius.encryptForPeer({
      payloadJson: payload,
      peerPublicKey: transferRow!.hiuPublicKeyB64,
      peerNonce: transferRow!.hiuNonceB64,
    });

    await handleBundlePush(
      {
        iqTenantId: TENANT,
        transferId: transferRow!.transferId,
        inboundRequestId: randomUUID(),
        body: {
          pageNumber: 0,
          pageCount: 1,
          transactionId: transferRow!.cmTransactionId ?? "txn-1",
          entries: [
            {
              content: hipEncrypt.encryptedPayload,
              media: "application/fhir+json",
              checksum: "abc",
              careContextReference: "cc1",
            },
          ],
          keyMaterial: {
            cryptoAlg: "ECDH",
            curve: "Curve25519",
            dhPublicKey: {
              expiry: new Date(Date.now() + 86400000).toISOString(),
              parameters: "Curve25519/32byte random key",
              keyValue: hipEncrypt.ourPublicKey,
            },
            nonce: hipEncrypt.ourNonce,
          },
        },
      },
      deps,
    );

    expect(transferRow!.state).toBe(M3Hiu.ACKNOWLEDGED);
    expect(session!.state).toBe(M3Hiu.ACKNOWLEDGED);
    expect(transferRow!.bundleJson).toBeTruthy();
    expect(session!.context.bundleJsonId).toBe(transferRow!.transferId);
  });
});
