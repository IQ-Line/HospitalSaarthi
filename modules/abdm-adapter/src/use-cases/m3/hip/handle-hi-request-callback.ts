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
    state: "DATA_REQUESTED",
  });

  const transactionId = parsed?.transactionId ?? input.inboundRequestId;

  const ackBody: HipHealthInformationAckRequest = {
    hiRequest: {
      transactionId,
      sessionStatus: parsed ? "ACKNOWLEDGED" : "FAILED",
    },
    response: { requestId: input.inboundRequestId },
    ...(!parsed
      ? {
          error: {
            code: "ABDM-1001",
            message: "invalid hiRequest body",
          },
        }
      : {}),
  };

  if (!skipOutboundGatewayInDev()) {
    await deps.gateway.post({
      path: M2_GATEWAY_PATHS.hipHiAck,
      body: ackBody,
      target: "gateway",
      requestId: input.inboundRequestId,
      xHipId: deps.xHipId,
    });
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "ACKNOWLEDGED",
  });

  if (!parsed || !deps.dataPush) {
    if (!parsed) {
      await deps.sessions.patch({
        iqTenantId: input.iqTenantId,
        sessionId: session.sessionId,
        state: "FAILED",
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
      state: "FAILED",
    });
    return;
  }

  const refreshed = await deps.sessions.findById({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
  });
  if (!refreshed) return;
  assertFlowKind(refreshed, "abdm.m3.hip.v1");

  try {
    const careRefs = await pushHealthInformationForSession(
      {
        iqTenantId: input.iqTenantId,
        session: refreshed,
        parsed,
        patientId,
      },
      deps,
    );

    await notifyHipDataTransfer(
      {
        iqTenantId: input.iqTenantId,
        consentId: parsed.consentId,
        transactionId: parsed.transactionId,
        careContextReferences: careRefs,
        inboundRequestId: input.inboundRequestId,
      },
      deps,
    );
  } catch (err: unknown) {
    const failureMessage = err instanceof Error ? err.message : String(err);
    abdmWarn("abdm.m3.hip_hi.push_failed", {
      sessionId: session.sessionId,
      consentId: parsed.consentId,
      transactionId: parsed.transactionId,
      requestId: input.inboundRequestId,
      message: failureMessage,
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
      contextMerge: {
        error: { code: "HI_PUSH_FAILED", message: failureMessage },
      },
    });
    await notifyHipDataTransfer(
      {
        iqTenantId: input.iqTenantId,
        consentId: parsed.consentId,
        transactionId: parsed.transactionId,
        careContextReferences: [],
        inboundRequestId: input.inboundRequestId,
        failed: true,
      },
      deps,
    ).catch(() => undefined);
    return;
  }
}
