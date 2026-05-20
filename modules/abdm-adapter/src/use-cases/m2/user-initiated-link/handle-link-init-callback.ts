import { randomUUID } from "node:crypto";
import type { LinkInitRequest, OnLinkInitRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";

export async function handleLinkInitCallback(
  input: AbdmTenantInput<LinkInitRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findUserLinkByTransactionId({
    iqTenantId: input.iqTenantId,
    transactionId: input.transactionId,
  });
  if (!session) return;

  const linkRefNumber =
    input.link.referenceNumber?.trim() || randomUUID();

  const onInitBody: OnLinkInitRequest = {
    transactionId: input.transactionId,
    link: {
      ...input.link,
      referenceNumber: linkRefNumber,
    },
    response: { requestId: input.inboundRequestId },
  };

  await deps.gateway.post({
    path: "/api/hiecm/user-initiated-linking/v3/link/care-context/on-init",
    body: onInitBody,
    target: "gateway",
    requestId: input.inboundRequestId,
    xHipId: deps.xHipId,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_DISPATCHED",
    contextMerge: { linkRefNumber, otpToken: input.link.referenceNumber },
  });
}
