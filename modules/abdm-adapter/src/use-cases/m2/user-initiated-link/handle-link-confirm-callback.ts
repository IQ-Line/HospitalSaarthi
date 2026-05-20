import type { LinkConfirmRequest, OnLinkConfirmRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";

export async function handleLinkConfirmCallback(
  input: AbdmTenantInput<LinkConfirmRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findUserLinkByLinkRefNumber({
    iqTenantId: input.iqTenantId,
    linkRefNumber: input.confirmation.linkRefNumber,
  });
  if (!session) return;

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "LINK_CONFIRMED",
    contextMerge: { confirmToken: input.confirmation.token },
  });

  const ctx = session.context;
  const careContexts = ctx.careContexts ?? [];
  for (const cc of careContexts) {
    await deps.recordFoundation.markCareContextLinked({
      iqTenantId: input.iqTenantId,
      careContextId: cc.referenceNumber,
    });
  }

  const patientPayload =
    careContexts.length > 0
      ? [
          {
            referenceNumber: ctx.patientId ?? ctx.abhaAddress ?? "patient",
            display: ctx.abhaAddress ?? "patient",
            careContexts: careContexts.map((c) => ({
              referenceNumber: c.referenceNumber,
              display: c.display,
            })),
            hiType: "OPCONSULTATION",
            count: careContexts.length,
          },
        ]
      : [];

  const onConfirmBody: OnLinkConfirmRequest = {
    patient: patientPayload,
    response: { requestId: input.inboundRequestId },
  };

  await deps.gateway.post({
    path: "/api/hiecm/user-initiated-linking/v3/link/care-context/on-confirm",
    body: onConfirmBody,
    target: "gateway",
    requestId: input.inboundRequestId,
    xHipId: deps.xHipId,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "LINKED",
  });
}
