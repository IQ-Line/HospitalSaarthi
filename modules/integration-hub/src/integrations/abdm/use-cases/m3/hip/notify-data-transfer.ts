import { randomUUID } from "node:crypto";
import type { HipDataFlowNotifyRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { skipOutboundGatewayInDev } from "../../../lib/dev-inbound-simulation.js";
import { formatNhaCmTimestamp } from "../../../lib/nha-cm-timestamp.js";
import { AbdmGatewayError } from "../../../lib/gateway-errors.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";

export async function notifyHipDataTransfer(
  input: {
    iqTenantId: string;
    consentId: string;
    transactionId: string;
    careContextReferences: string[];
    inboundRequestId: string;
    failed?: boolean;
  },
  deps: AbdmAdapterDeps,
): Promise<void> {
  const statusResponses = input.careContextReferences.map((ref) => ({
    careContextReference: ref,
    hiStatus: (input.failed ? "ERRORED" : "DELIVERED") as "DELIVERED" | "ERRORED",
  }));

  const body: HipDataFlowNotifyRequest = {
    notification: {
      consentId: input.consentId,
      transactionId: input.transactionId,
      doneAt: formatNhaCmTimestamp(new Date().toISOString()),
      notifier: { type: "HIP", id: deps.xHipId },
      statusNotification: {
        sessionStatus: input.failed ? "FAILED" : "TRANSFERRED",
        hipId: deps.xHipId,
        statusResponses: statusResponses.map((r) => ({
          ...r,
          description: input.failed ? "errored" : "sent",
        })),
      },
    },
    response: { requestId: input.inboundRequestId },
  };

  if (skipOutboundGatewayInDev()) return;

  try {
    await deps.gateway.post({
      path: M2_GATEWAY_PATHS.hipDataNotify,
      body,
      target: "gateway",
      requestId: randomUUID(),
      xHipId: deps.xHipId,
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
    abdmWarn("abdm.m3.hip_hi.notify_failed", {
      consentId: input.consentId,
      transactionId: input.transactionId,
      ...gateway,
    });
    throw e;
  }
}
