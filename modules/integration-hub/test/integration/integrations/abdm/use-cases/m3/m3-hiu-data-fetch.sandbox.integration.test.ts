import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSandboxDatabaseUrl } from "../../../../../../src/integrations/abdm/test-utils/sandbox-env.js";
import {
  buildM3SandboxDeps,
  M3_SANDBOX_TENANT,
  runM3ConsentGrantedFixture,
} from "../../../../../../src/integrations/abdm/test-utils/m3-sandbox-harness.js";
import { startDataRequest } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/start-data-request.js";
import { handleOnDataRequestCallback } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/handle-on-data-request-callback.js";
import { handleBundlePush } from "../../../../../../src/integrations/abdm/use-cases/m3/hiu/handle-bundle-push.js";
import { M3Hiu } from "../../../../../../src/integrations/abdm/lib/m3-fsm-states.js";

/**
 * Sandbox integration — HIU data-fetch leg (consent granted → ACKNOWLEDGED).
 * Requires Postgres + M3 migration. Mock gateway; real Drizzle repos.
 * Full sequence: m3-hiu-mock-loop.integration.test.ts | scripts/m3/full-loop.sh
 */
const RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1";
const DB_URL = resolveSandboxDatabaseUrl();

describe.skipIf(!RUN || !DB_URL)("m3 HIU data-fetch sandbox", () => {
  beforeEach(() => {
    vi.stubEnv("ABDM_M3_MOCK_GATEWAY", "true");
    vi.stubEnv("ABDM_ALLOW_INSECURE_CALLBACKS", "true");
    vi.stubEnv("ABDM_ADAPTER_PUBLIC_BASE_URL", "http://localhost:3007");
  });

  it("runs data-request → on-request → bundle push → ACKNOWLEDGED", async () => {
    const deps = buildM3SandboxDeps(DB_URL!);
    const { consentId, session } = await runM3ConsentGrantedFixture(deps);

    const dataReq = await startDataRequest(
      { iqTenantId: M3_SANDBOX_TENANT, consentId },
      deps,
    );
    expect(dataReq.state).toBe(M3Hiu.DATA_REQUESTED);

    const transfer = await deps.m3DataTransfers.findById(
      M3_SANDBOX_TENANT,
      dataReq.transferId,
    );
    expect(transfer).toBeTruthy();
    expect(transfer!.hiuPublicKeyB64).toBeTruthy();
    expect(transfer!.hiuNonceB64).toBeTruthy();

    const cmTxnId = `TXN-SBX-${randomUUID()}`;
    await handleOnDataRequestCallback(
      {
        iqTenantId: M3_SANDBOX_TENANT,
        inboundRequestId: randomUUID(),
        response: { requestId: transfer!.outboundRequestId! },
        hiRequest: { transactionId: cmTxnId, sessionStatus: "ACKNOWLEDGED" },
      },
      deps,
    );

    const afterOnRequest = await deps.m3DataTransfers.findById(
      M3_SANDBOX_TENANT,
      dataReq.transferId,
    );
    expect(afterOnRequest!.state).toBe(M3Hiu.AWAITING_PUSH);
    expect(afterOnRequest!.cmTransactionId).toBe(cmTxnId);

    const hipEncrypt = await deps.fidelius.encryptForPeer({
      payloadJson: JSON.stringify({ resourceType: "Bundle", id: "sandbox-fetch" }),
      peerPublicKey: transfer!.hiuPublicKeyB64,
      peerNonce: transfer!.hiuNonceB64,
    });

    await handleBundlePush(
      {
        iqTenantId: M3_SANDBOX_TENANT,
        transferId: dataReq.transferId,
        inboundRequestId: randomUUID(),
        body: {
          pageNumber: 0,
          pageCount: 1,
          transactionId: cmTxnId,
          entries: [
            {
              content: hipEncrypt.encryptedPayload,
              media: "application/fhir+json",
              checksum: "sandbox",
              careContextReference: "VISIT-MOCK-001",
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

    const finalTransfer = await deps.m3DataTransfers.findById(
      M3_SANDBOX_TENANT,
      dataReq.transferId,
    );
    expect(finalTransfer!.state).toBe(M3Hiu.ACKNOWLEDGED);
    expect(finalTransfer!.bundleJson).toBeTruthy();

    const finalSession = await deps.sessions.findById({
      iqTenantId: M3_SANDBOX_TENANT,
      sessionId: session.sessionId,
    });
    expect(finalSession!.state).toBe(M3Hiu.ACKNOWLEDGED);
  });
});
