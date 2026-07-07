import { randomUUID } from "node:crypto";
import type { HipHealthInformationRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { HipHealthInformationAckRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import {
  parseHiRequestBody,
  type ParsedHiRequest,
} from "../../../lib/parse-hi-request-body.js";
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

const PUSH_RETRY = { maxAttempts: 3, initialMs: 500, maxMs: 4000 } as const;

/** §6.3.4 — build the hiRequest ack returned to the CM (ACKNOWLEDGED or FAILED). */
function buildHiAckBody(
  parsed: ParsedHiRequest | null,
  transactionId: string,
  inboundRequestId: string,
): HipHealthInformationAckRequest {
  return {
    hiRequest: {
      transactionId,
      sessionStatus: parsed ? "ACKNOWLEDGED" : "FAILED",
    },
    response: { requestId: inboundRequestId },
    ...(parsed
      ? { error: null }
      : {
          error: {
            code: "ABDM-1001",
            message: "invalid hiRequest body",
          },
        }),
  };
}

/**
 * §6.3.3 — POST the hiRequest ack to the gateway. Returns whether the ack
 * reached the CM: an ack failure is logged and gates the push — without an
 * ACKNOWLEDGED ack the CM would reject the bundles with ABDM-1017, so the
 * caller marks the session FAILED and skips the push. Dev-skip counts as acked.
 */
async function postHiAck(
  ackBody: HipHealthInformationAckRequest,
  ctx: { consentId?: string; transactionId: string; inboundRequestId: string },
  deps: AbdmAdapterDeps,
): Promise<boolean> {
  if (skipOutboundGatewayInDev()) return true;
  try {
    await deps.gateway.post({
      path: M2_GATEWAY_PATHS.hipHiAck,
      body: ackBody,
      target: "gateway",
      requestId: randomUUID(),
      xHipId: deps.xHipId,
    });
    return true;
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
      consentId: ctx.consentId,
      transactionId: ctx.transactionId,
      requestId: ctx.inboundRequestId,
      ...gateway,
    });
    return false;
  }
}

/**
 * §6.3.5 recovery — encrypt/push failed: mark the session FAILED and best-effort
 * notify the CM that the transfer failed (with whatever care-context refs the
 * stored consent artefacts carry).
 */
async function handlePushFailure(
  err: unknown,
  ctx: {
    iqTenantId: string;
    sessionId: string;
    parsed: ParsedHiRequest;
    transactionId: string;
    inboundRequestId: string;
  },
  deps: AbdmAdapterDeps,
): Promise<void> {
  const failureMessage = err instanceof Error ? err.message : String(err);
  abdmWarn("abdm.m3.hip_hi.push_failed", {
    sessionId: ctx.sessionId,
    consentId: ctx.parsed.consentId,
    transactionId: ctx.parsed.transactionId,
    requestId: ctx.inboundRequestId,
    message: failureMessage,
  });
  await deps.sessions.patch({
    iqTenantId: ctx.iqTenantId,
    sessionId: ctx.sessionId,
    state: M3Hip.FAILED,
    contextMerge: {
      error: { code: "HI_PUSH_FAILED", message: failureMessage },
    },
  });
  const [m3Artefact, consentArtefact] = await Promise.all([
    deps.m3ConsentArtefactsHiu.findById(ctx.iqTenantId, ctx.parsed.consentId),
    deps.consentArtefacts.findById(ctx.iqTenantId, ctx.parsed.consentId),
  ]);
  const failedCareRefs = extractConsentCareContextRefs({
    m3Artefact,
    consentArtefact,
  });
  await notifyHipDataTransfer(
    {
      iqTenantId: ctx.iqTenantId,
      consentId: ctx.parsed.consentId,
      transactionId: ctx.transactionId,
      careContextReferences: failedCareRefs,
      inboundRequestId: ctx.inboundRequestId,
      failed: true,
    },
    deps,
  ).catch(() => undefined);
}

/** Whether the matching HIU-side transfer has already reached ACKNOWLEDGED. */
async function findHiuTransfer(
  iqTenantId: string,
  inboundRequestId: string,
  deps: AbdmAdapterDeps,
) {
  return (
    (await deps.m3DataTransfers.findByOutboundRequestId({
      iqTenantId,
      outboundRequestId: inboundRequestId,
    })) ?? (await deps.m3DataTransfers.findById(iqTenantId, inboundRequestId))
  );
}

/**
 * §6.3.6 — notify the CM that the data transfer completed. If notify fails but
 * the HIU side already acknowledged, the flow is effectively done (warn only);
 * otherwise mark the session FAILED. Returns false when the session was failed.
 */
async function notifyCmOfTransfer(
  ctx: {
    iqTenantId: string;
    sessionId: string;
    parsed: ParsedHiRequest;
    transactionId: string;
    inboundRequestId: string;
    careRefs: string[];
  },
  deps: AbdmAdapterDeps,
): Promise<boolean> {
  const hiuTransfer = await findHiuTransfer(
    ctx.iqTenantId,
    ctx.inboundRequestId,
    deps,
  );
  const hiuTransferDone = hiuTransfer?.state === M3Hiu.ACKNOWLEDGED;

  try {
    await retryWithBackoff(
      () =>
        notifyHipDataTransfer(
          {
            iqTenantId: ctx.iqTenantId,
            consentId: ctx.parsed.consentId,
            transactionId: ctx.transactionId,
            careContextReferences: ctx.careRefs,
            inboundRequestId: ctx.inboundRequestId,
          },
          deps,
        ),
      PUSH_RETRY,
    );
    return true;
  } catch (err: unknown) {
    if (hiuTransferDone) {
      abdmWarn("abdm.m3.hip_hi.notify_failed_hiu_ok", {
        sessionId: ctx.sessionId,
        transferId: hiuTransfer?.transferId,
        consentId: ctx.parsed.consentId,
      });
      return true;
    }
    const failureMessage = err instanceof Error ? err.message : String(err);
    abdmWarn("abdm.m3.hip_hi.notify_failed", {
      sessionId: ctx.sessionId,
      consentId: ctx.parsed.consentId,
      transactionId: ctx.transactionId,
      requestId: ctx.inboundRequestId,
      message: failureMessage,
    });
    await deps.sessions.patch({
      iqTenantId: ctx.iqTenantId,
      sessionId: ctx.sessionId,
      state: M3Hip.FAILED,
      contextMerge: {
        error: { code: "HI_NOTIFY_FAILED", message: failureMessage },
      },
    });
    return false;
  }
}

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

  const ackSucceeded = await postHiAck(
    buildHiAckBody(parsed, transactionId, input.inboundRequestId),
    {
      consentId: parsed?.consentId,
      transactionId,
      inboundRequestId: input.inboundRequestId,
    },
    deps,
  );

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

  let careRefs: string[];
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
      PUSH_RETRY,
    );
  } catch (err: unknown) {
    await handlePushFailure(
      err,
      {
        iqTenantId: input.iqTenantId,
        sessionId: session.sessionId,
        parsed,
        transactionId,
        inboundRequestId: input.inboundRequestId,
      },
      deps,
    );
    return;
  }

  const notified = await notifyCmOfTransfer(
    {
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      parsed,
      transactionId,
      inboundRequestId: input.inboundRequestId,
      careRefs,
    },
    deps,
  );
  if (!notified) return;

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: M3Hip.ACKNOWLEDGED,
  });
}
