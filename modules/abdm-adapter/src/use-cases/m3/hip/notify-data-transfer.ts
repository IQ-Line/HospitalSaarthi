import { randomUUID } from "node:crypto";
import type { HipDataFlowNotifyRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { skipOutboundGatewayInDev } from "../../../lib/dev-inbound-simulation.js";

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
      statusNotification: {
        sessionStatus: input.failed ? "FAILED" : "TRANSFERRED",
        hipId: deps.xHipId,
        statusResponses,
      },
    },
  };

  if (skipOutboundGatewayInDev()) return;

  await deps.gateway.post({
    path: M2_GATEWAY_PATHS.hipDataNotify,
    body,
    target: "gateway",
    requestId: randomUUID(),
    xHipId: deps.xHipId,
  });
}
