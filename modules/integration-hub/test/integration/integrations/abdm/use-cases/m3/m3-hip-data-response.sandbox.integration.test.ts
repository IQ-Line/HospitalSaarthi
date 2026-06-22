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
import { handleHipHiRequestCallback } from "../../../../../../src/integrations/abdm/use-cases/m3/hip/handle-hi-request-callback.js";
import { M3Hiu } from "../../../../../../src/integrations/abdm/lib/m3-fsm-states.js";

/**
 * Sandbox integration — HIP HI request + encrypt/push (mock `dataPush` client).
 * Requires Postgres + M3 migration. HIU bundle ingest is covered by m3-hiu-data-fetch sandbox.
 */
const RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1";
const DB_URL = resolveSandboxDatabaseUrl();

describe.skipIf(!RUN || !DB_URL)("m3 HIP data-response sandbox", () => {
  beforeEach(() => {
    vi.stubEnv("ABDM_M3_MOCK_GATEWAY", "true");
    vi.stubEnv("ABDM_ALLOW_INSECURE_CALLBACKS", "true");
    vi.stubEnv("ABDM_DEV_INBOUND_SIMULATION", "false");
    vi.stubEnv("ABDM_ADAPTER_PUBLIC_BASE_URL", "http://localhost:3007");
  });

  it("handles hip/health-information/request and invokes dataPush with HIU transfer URL", async () => {
    const push = vi.fn().mockResolvedValue(undefined);
    const deps = buildM3SandboxDeps(DB_URL!);
    deps.dataPush = { push } as never;

    const { consentId } = await runM3ConsentGrantedFixture(deps);

    const dataReq = await startDataRequest(
      { iqTenantId: M3_SANDBOX_TENANT, consentId },
      deps,
    );
    const transfer = await deps.m3DataTransfers.findById(
      M3_SANDBOX_TENANT,
      dataReq.transferId,
    );
    expect(transfer!.state).toBe(M3Hiu.DATA_REQUESTED);

    const inboundRequestId = transfer!.outboundRequestId!;
    const cmTxnId = `TXN-HIP-${randomUUID()}`;

    await handleOnDataRequestCallback(
      {
        iqTenantId: M3_SANDBOX_TENANT,
        inboundRequestId: randomUUID(),
        response: { requestId: inboundRequestId },
        hiRequest: { transactionId: cmTxnId },
      },
      deps,
    );

    const dataPushUrl = `http://localhost:3007/api/abdm/v1/m3/hiu/health-information/transfer/${dataReq.transferId}`;

    await handleHipHiRequestCallback(
      {
        iqTenantId: M3_SANDBOX_TENANT,
        inboundRequestId,
        transactionId: cmTxnId,
        hiRequest: {
          consent: { id: consentId },
          dateRange: {
            from: new Date(Date.now() - 90 * 86400000).toISOString(),
            to: new Date().toISOString(),
          },
          dataPushUrl,
          keyMaterial: {
            cryptoAlg: "ECDH",
            curve: "Curve25519",
            dhPublicKey: {
              expiry: new Date(Date.now() + 86400000).toISOString(),
              parameters: "Curve25519/32byte random key",
              keyValue: transfer!.hiuPublicKeyB64,
            },
            nonce: transfer!.hiuNonceB64,
          },
        },
      },
      deps,
    );

    expect(push).toHaveBeenCalled();
    const pushArg = push.mock.calls[0]![0] as {
      dataPushUrl: string;
      body: { entries?: unknown[] };
    };
    expect(pushArg.dataPushUrl).toContain(dataReq.transferId);
    expect((pushArg.body.entries ?? []).length).toBeGreaterThan(0);

    const afterHip = await deps.m3DataTransfers.findById(
      M3_SANDBOX_TENANT,
      dataReq.transferId,
    );
    expect(afterHip!.state).toBe(M3Hiu.AWAITING_PUSH);
    expect(afterHip!.cmTransactionId).toBe(cmTxnId);
  });
});
