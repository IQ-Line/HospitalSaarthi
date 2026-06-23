import { randomUUID } from "node:crypto";
import type { EncryptedBundlePushBody } from "@hims/ts-sdk-abha/protocol/m3/hiu-data-fetch.js";
import type { DataFlowNotifyBody } from "@hims/ts-sdk-abha/protocol/m3/hiu-data-fetch.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M3_GATEWAY_PATHS } from "../../../lib/m3-gateway-paths.js";
import { skipM3OutboundGateway } from "../../../lib/m3-runtime-env.js";
import { createHealthRecordReceivedEnvelope } from "../../../lib/abdm-envelope.js";
import { AbdmGatewayError } from "../../../lib/gateway-errors.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";

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

  await deps.m3DataTransfers.patchWithSession({
    iqTenantId: input.iqTenantId,
    transferId: transfer.transferId,
    transfer: {
      state: M3Hiu.BUNDLES_RECEIVED,
      hipPublicKeyB64: peerKey,
      hipNonceB64: peerNonce,
    },
  });

  const privateKeyPlain = deps.payloadEncryptor.decrypt(transfer.hiuPrivateKeyJwk);
  if (!privateKeyPlain) {
    await failTransfer(deps, transfer, "KEY_DECRYPT_FAILED", "HIU private key unavailable");
    return;
  }

  const decryptedParts = await decryptEntries(deps, transfer, input.body.entries, {
    peerKey,
    peerNonce,
    privateKeyPlain,
  });
  if (decryptedParts === null) return;

  const bundleJson = {
    transactionId: input.body.transactionId,
    entries: decryptedParts.map((content, i) => ({
      content,
      careContextReference: input.body.entries[i]?.careContextReference,
    })),
  };

  await deps.m3DataTransfers.patchWithSession({
    iqTenantId: input.iqTenantId,
    transferId: transfer.transferId,
    transfer: {
      state: M3Hiu.RECORDS_INGESTED,
      bundleJson,
    },
    session: transfer.sessionId
      ? {
          sessionId: transfer.sessionId,
          state: M3Hiu.RECORDS_INGESTED,
          contextMerge: {
            bundleJsonId: transfer.transferId,
            hipPublicKeyBase64: peerKey,
            hipNonceBase64: peerNonce,
          },
        }
      : undefined,
  });

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
    await sendDataFlowNotify(deps, {
      notifyBody,
      requestId: input.inboundRequestId ?? randomUUID(),
      transferId: transfer.transferId,
      consentId: transfer.consentId,
      cmTransactionId: cmTxn,
    });
  }

  await deps.m3DataTransfers.patchWithSession({
    iqTenantId: input.iqTenantId,
    transferId: transfer.transferId,
    transfer: { state: M3Hiu.ACKNOWLEDGED },
    session: transfer.sessionId
      ? { sessionId: transfer.sessionId, state: M3Hiu.ACKNOWLEDGED }
      : undefined,
  });
}

/**
 * Decrypts every pushed entry in order via Fidelius. On any failure, marks the
 * transfer failed (DECRYPT_FAILED) and returns `null` so the caller short-circuits;
 * otherwise returns the plaintext bundle parts in entry order.
 */
async function decryptEntries(
  deps: AbdmAdapterDeps,
  transfer: { iqTenantId: string; transferId: string; sessionId: string | null; hiuNonceB64: string },
  entries: EncryptedBundlePushBody["entries"],
  keys: { peerKey: string; peerNonce: string; privateKeyPlain: string },
): Promise<string[] | null> {
  const decryptedParts: string[] = [];
  try {
    for (const entry of entries) {
      const plain = await deps.fidelius.decryptBundle({
        encryptedPayload: entry.content,
        peerPublicKey: keys.peerKey,
        peerNonce: keys.peerNonce,
        ourPrivateKey: keys.privateKeyPlain,
        ourNonce: transfer.hiuNonceB64,
      });
      decryptedParts.push(plain);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await failTransfer(deps, transfer, "DECRYPT_FAILED", message);
    return null;
  }
  return decryptedParts;
}

/**
 * Best-effort CM data-flow notify: posts to the gateway and swallows failures by
 * logging a structured warning (the records are already ingested, so a notify
 * failure must not roll back the transfer).
 */
async function sendDataFlowNotify(
  deps: AbdmAdapterDeps,
  args: {
    notifyBody: DataFlowNotifyBody;
    requestId: string;
    transferId: string;
    consentId: string;
    cmTransactionId: string;
  },
): Promise<void> {
  try {
    await deps.gateway.post({
      path: M3_GATEWAY_PATHS.dataFlowNotify,
      body: args.notifyBody,
      target: "gateway",
      requestId: args.requestId,
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
      transferId: args.transferId,
      consentId: args.consentId,
      cmTransactionId: args.cmTransactionId,
      ...gateway,
    });
  }
}

async function failTransfer(
  deps: AbdmAdapterDeps,
  transfer: { iqTenantId: string; transferId: string; sessionId: string | null },
  code: string,
  message: string,
): Promise<void> {
  await deps.m3DataTransfers.patchWithSession({
    iqTenantId: transfer.iqTenantId,
    transferId: transfer.transferId,
    transfer: {
      state: M3Hiu.EXPIRED,
      error: { code, message },
    },
    session: transfer.sessionId
      ? {
          sessionId: transfer.sessionId,
          state: M3Hiu.EXPIRED,
          contextMerge: { error: { code, message } },
        }
      : undefined,
  });
}
