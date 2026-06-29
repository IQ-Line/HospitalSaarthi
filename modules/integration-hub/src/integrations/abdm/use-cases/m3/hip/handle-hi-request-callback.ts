import { randomUUID } from "node:crypto";
import type { HipHealthInformationRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { HipHealthInformationAckRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { parseHiRequestBody } from "../../../lib/parse-hi-request-body.js";
import { assertFlowKind } from "../../../domain/session.js";
import { pushHealthInformationForSession } from "./push-health-information.js";
import { notifyHipDataTransfer } from "./notify-data-transfer.js";
import { skipOutboundGatewayInDev } from "../../../lib/dev-inbound-simulation.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import { retryWithBackoff } from "../../../lib/retry-with-backoff.js";
import { AbdmGatewayError } from "../../../lib/gateway-errors.js";
import { extractConsentCareContextRefs } from "../../../lib/extract-consent-care-context-refs.js";
import { M3Hip } from "../../../lib/m3-fsm-states.js";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";

/** §6.3.3–6.3.6 — ack, encrypt/push bundles, notify CM. */
export async function handleHipHiRequestCallback(
  input: AbdmTenantInput<HipHealthInformationRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const parsed = parseHiRequestBody(input, input.inboundRequestId);
  const session = await deps.sessions.create({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m3.hip.v1",
    initialContext: {
      consentId: parsed?.consentId,
      transactionId: parsed?.transactionId ?? input.inboundRequestId,
      dataPushUrl: parsed?.dataPushUrl,
      requestId: input.inboundRequestId,
    },
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: M3Hip.DATA_REQUESTED,
  });

  const activeTransfer =
    parsed &&
    (await deps.m3DataTransfers.findLatestActiveByConsentId(
      input.iqTenantId,
      parsed.consentId,
    ));
  // CM hiRequest.transactionId is authoritative (ABDM-1017 if push uses a different id).
  const transactionId =
    parsed?.transactionId ??
    activeTransfer?.cmTransactionId ??
    input.inboundRequestId;
  if (
    parsed?.transactionId &&
    activeTransfer?.cmTransactionId &&
    activeTransfer.cmTransactionId !== parsed.transactionId
  ) {
    abdmWarn("abdm.m3.hip_hi.transaction_id_mismatch", {
      consentId: parsed.consentId,
      inboundTransactionId: parsed.transactionId,
      activeTransferTransactionId: activeTransfer.cmTransactionId,
      usingTransactionId: transactionId,
    });
  }
  if (
    input.transactionId &&
    input.hiRequest?.transactionId &&
    input.transactionId !== input.hiRequest.transactionId
  ) {
    abdmWarn("abdm.m3.hip_hi.inbound_transaction_id_divergence", {
      consentId: parsed?.consentId,
      bodyTransactionId: input.transactionId,
      hiRequestTransactionId: input.hiRequest.transactionId,
      resolvedTransactionId: transactionId,
    });
  }

  const ackBody: HipHealthInformationAckRequest = {
    hiRequest: {
      transactionId,
      sessionStatus: parsed ? "ACKNOWLEDGED" : "FAILED",
    },
    response: { requestId: input.inboundRequestId },
    ...(parsed
      ? { error: null }
      : {
          error: {
            code: "ABDM-1001",
            message: "invalid hiRequest body",
          },
        }),
  };

  let ackSucceeded = skipOutboundGatewayInDev();
  if (!skipOutboundGatewayInDev()) {
    try {
      await deps.gateway.post({
        path: M2_GATEWAY_PATHS.hipHiAck,
        body: ackBody,
        target: "gateway",
        requestId: randomUUID(),
        xHipId: deps.xHipId,
      });
      ackSucceeded = true;
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
      abdmWarn("abdm.m3.hip_hi.gateway_ack_failed", {
        consentId: parsed?.consentId,
        transactionId,
        requestId: input.inboundRequestId,
        ...gateway,
      });
    }
  }

  if (!ackSucceeded) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: M3Hip.FAILED,
      contextMerge: {
        error: {
          code: "HI_ACK_FAILED",
          message: "HIP on-request ack to CM failed — push skipped (ABDM-1017)",
        },
      },
    });
    return;
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: M3Hip.ACKNOWLEDGED,
  });

  if (!parsed || !deps.dataPush) {
    if (!parsed) {
      await deps.sessions.patch({
        iqTenantId: input.iqTenantId,
        sessionId: session.sessionId,
        state: M3Hip.FAILED,
      });
    }
    return;
  }

  const artefact = await deps.consentArtefacts.findById(
    input.iqTenantId,
    parsed.consentId,
  );
  const patientId = artefact?.patientId;
  if (!patientId) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: M3Hip.FAILED,
    });
    return;
  }

  const refreshed = await deps.sessions.findById({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
  });
  if (!refreshed) return;
  assertFlowKind(refreshed, "abdm.m3.hip.v1");

  let careRefs: string[] = [];
  try {
    careRefs = await retryWithBackoff(
      () =>
        pushHealthInformationForSession(
          {
            iqTenantId: input.iqTenantId,
            session: refreshed,
            parsed,
            patientId,
            transactionId,
          },
          deps,
        ),
      { maxAttempts: 3, initialMs: 500, maxMs: 4000 },
    );
  } catch (err: unknown) {
    const failureMessage = err instanceof Error ? err.message : String(err);
    abdmWarn("abdm.m3.hip_hi.push_failed", {
      sessionId: session.sessionId,
      consentId: parsed.consentId,
      transactionId,
      requestId: input.inboundRequestId,
      message: failureMessage,
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: M3Hip.FAILED,
      contextMerge: {
        error: { code: "HI_PUSH_FAILED", message: failureMessage },
      },
    });
    const [m3Artefact, consentArtefact] = await Promise.all([
      deps.m3ConsentArtefactsHiu.findById(input.iqTenantId, parsed.consentId),
      deps.consentArtefacts.findById(input.iqTenantId, parsed.consentId),
    ]);
    const failedCareRefs = extractConsentCareContextRefs({
      m3Artefact,
      consentArtefact,
    });
    await notifyHipDataTransfer(
      {
        iqTenantId: input.iqTenantId,
        consentId: parsed.consentId,
        transactionId,
        careContextReferences: failedCareRefs,
        inboundRequestId: input.inboundRequestId,
        failed: true,
      },
      deps,
    ).catch(() => undefined);
    return;
  }

  const hiuTransfer =
    (await deps.m3DataTransfers.findByOutboundRequestId({
      iqTenantId: input.iqTenantId,
      outboundRequestId: input.inboundRequestId,
    })) ??
    (await deps.m3DataTransfers.findById(
      input.iqTenantId,
      input.inboundRequestId,
    ));
  const hiuTransferDone = hiuTransfer?.state === M3Hiu.ACKNOWLEDGED;

  try {
    await retryWithBackoff(
      () =>
        notifyHipDataTransfer(
          {
            iqTenantId: input.iqTenantId,
            consentId: parsed.consentId,
            transactionId,
            careContextReferences: careRefs,
            inboundRequestId: input.inboundRequestId,
          },
          deps,
        ),
      { maxAttempts: 3, initialMs: 500, maxMs: 4000 },
    );
  } catch (err: unknown) {
    if (!hiuTransferDone) {
      const failureMessage = err instanceof Error ? err.message : String(err);
      abdmWarn("abdm.m3.hip_hi.notify_failed", {
        sessionId: session.sessionId,
        consentId: parsed.consentId,
        transactionId,
        requestId: input.inboundRequestId,
        message: failureMessage,
      });
      await deps.sessions.patch({
        iqTenantId: input.iqTenantId,
        sessionId: session.sessionId,
        state: M3Hip.FAILED,
        contextMerge: {
          error: { code: "HI_NOTIFY_FAILED", message: failureMessage },
        },
      });
      return;
    }
    abdmWarn("abdm.m3.hip_hi.notify_failed_hiu_ok", {
      sessionId: session.sessionId,
      transferId: hiuTransfer?.transferId,
      consentId: parsed.consentId,
    });
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: M3Hip.ACKNOWLEDGED,
  });
}
