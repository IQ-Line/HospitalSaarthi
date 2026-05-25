import { randomUUID } from "node:crypto";
import type { EncryptedBundlePushBody } from "@hims/ts-sdk-abha/protocol/m3/hiu-data-fetch.js";
import type { DataFlowNotifyBody } from "@hims/ts-sdk-abha/protocol/m3/hiu-data-fetch.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M3_GATEWAY_PATHS } from "../../../lib/m3-gateway-paths.js";
import { skipM3OutboundGateway } from "../../../lib/m3-runtime-env.js";
import { createHealthRecordReceivedEnvelope } from "../../../lib/abdm-envelope.js";
import { AbdmGatewayError } from "../../../lib/gateway-errors.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";

export async function handleBundlePush(
  input: AbdmTenantInput<{
    transferId: string;
    body: EncryptedBundlePushBody;
    /** HIP push `REQUEST-ID` header — echoed in CM data-flow notify. */
    inboundRequestId?: string;
  }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const transfer = await deps.m3DataTransfers.findById(
    input.iqTenantId,
    input.transferId,
  );
  if (!transfer) return;

  const peerKey = input.body.keyMaterial?.dhPublicKey?.keyValue;
  const peerNonce = input.body.keyMaterial?.nonce;
  if (!peerKey || !peerNonce) {
    await failTransfer(deps, transfer, "MISSING_KEY_MATERIAL", "HIP key material missing");
    return;
  }

  await deps.m3DataTransfers.patch({
    iqTenantId: input.iqTenantId,
    transferId: transfer.transferId,
    state: "BUNDLES_RECEIVED",
    hipPublicKeyB64: peerKey,
    hipNonceB64: peerNonce,
  });

  const privateKeyPlain = deps.payloadEncryptor.decrypt(transfer.hiuPrivateKeyJwk);
  if (!privateKeyPlain) {
    await failTransfer(deps, transfer, "KEY_DECRYPT_FAILED", "HIU private key unavailable");
    return;
  }

  const decryptedParts: string[] = [];
  try {
    for (const entry of input.body.entries) {
      const plain = await deps.fidelius.decryptFromPeer({
        encryptedPayload: entry.content,
        peerPublicKey: peerKey,
        peerNonce: peerNonce,
        ourPrivateKey: privateKeyPlain,
        ourNonce: transfer.hiuNonceB64,
      });
      decryptedParts.push(plain);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await failTransfer(deps, transfer, "DECRYPT_FAILED", message);
    return;
  }

  const bundleJson = {
    transactionId: input.body.transactionId,
    entries: decryptedParts.map((content, i) => ({
      content,
      careContextReference: input.body.entries[i]?.careContextReference,
    })),
  };

  await deps.m3DataTransfers.patch({
    iqTenantId: input.iqTenantId,
    transferId: transfer.transferId,
    state: "BUNDLES_DECRYPTED",
  });

  await deps.m3DataTransfers.patch({
    iqTenantId: input.iqTenantId,
    transferId: transfer.transferId,
    state: "RECORDS_INGESTED",
    bundleJson,
  });

  if (transfer.sessionId) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: transfer.sessionId,
      state: "RECORDS_INGESTED",
    });
  }

  if (deps.eventBus) {
    await deps.eventBus.publish(
      createHealthRecordReceivedEnvelope(input.iqTenantId, {
        transferId: transfer.transferId,
        consentId: transfer.consentId,
        transactionId: input.body.transactionId,
      }),
    );
  }

  const cmTxn = transfer.cmTransactionId ?? input.body.transactionId;
  const notifyBody: DataFlowNotifyBody = {
    notification: {
      consentId: transfer.consentId,
      transactionId: cmTxn,
      doneAt: new Date().toISOString(),
      notifier: { type: "HIU", id: deps.xHiuId },
      statusNotification: {
        sessionStatus: "RECEIVED",
        statusResponses: input.body.entries.map((e) => ({
          careContextReference: e.careContextReference,
          hiStatus: "DELIVERED" as const,
          description: "received",
        })),
      },
    },
    response: {
      requestId: input.inboundRequestId ?? randomUUID(),
    },
  };

  if (!skipM3OutboundGateway()) {
    try {
      await deps.gateway.post({
        path: M3_GATEWAY_PATHS.dataFlowNotify,
        body: notifyBody,
        target: "gateway",
        requestId: input.inboundRequestId ?? randomUUID(),
        headers: { "X-HIU-ID": deps.xHiuId },
      });
    } catch (e) {
      const gateway =
        e instanceof AbdmGatewayError
          ? {
              statusCode: e.statusCode,
              abdmCode: e.abdmCode,
              message: e.message,
              responseBody: e.responseBody,
            }
          : { message: e instanceof Error ? e.message : String(e) };
      abdmWarn("abdm.m3.hiu_data_flow_notify_failed", {
        transferId: transfer.transferId,
        consentId: transfer.consentId,
        cmTransactionId: cmTxn,
        ...gateway,
      });
      // Bundle is stored locally — do not fail the HIP→HIU push HTTP callback.
    }
  }

  await deps.m3DataTransfers.patch({
    iqTenantId: input.iqTenantId,
    transferId: transfer.transferId,
    state: "ACKNOWLEDGED",
  });

  if (transfer.sessionId) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: transfer.sessionId,
      state: "ACKNOWLEDGED",
    });
  }
}

async function failTransfer(
  deps: AbdmAdapterDeps,
  transfer: { iqTenantId: string; transferId: string; sessionId: string | null },
  code: string,
  message: string,
): Promise<void> {
  await deps.m3DataTransfers.patch({
    iqTenantId: transfer.iqTenantId,
    transferId: transfer.transferId,
    state: "EXPIRED",
    error: { code, message },
  });
  if (transfer.sessionId) {
    await deps.sessions.patch({
      iqTenantId: transfer.iqTenantId,
      sessionId: transfer.sessionId,
      state: "EXPIRED",
      contextMerge: { error: { code, message } },
    });
  }
}
