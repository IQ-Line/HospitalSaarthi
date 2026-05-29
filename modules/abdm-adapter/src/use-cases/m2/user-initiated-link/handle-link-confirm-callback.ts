import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import type { LinkConfirmRequest, OnLinkConfirmRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { resolveUnifiedLinkHiType } from "../../../lib/m2-link-hi-type.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";

export async function handleLinkConfirmCallback(
  input: AbdmTenantInput<LinkConfirmRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findUserLinkByLinkRefNumber({
    iqTenantId: input.iqTenantId,
    linkRefNumber: input.confirmation.linkRefNumber,
  });
  if (!session) return;

  const otpValid = await deps.linkOtpStore.consume({
    iqTenantId: input.iqTenantId,
    linkRefNumber: input.confirmation.linkRefNumber,
    token: input.confirmation.token,
  });
  if (!otpValid) {
    abdmWarn("abdm.m2.link_confirm.invalid_otp", {
      sessionId: session.sessionId,
      linkRefNumber: input.confirmation.linkRefNumber,
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
      contextMerge: {
        error: {
          code: ABDM_ERROR_CODES.INVALID_REQUEST,
          message: "Invalid or expired OTP",
        },
      },
    });
    return;
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "LINK_CONFIRMED",
  });

  const ctx = session.context;
  const careContexts = ctx.careContexts ?? [];

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
            hiType: resolveUnifiedLinkHiType(careContexts),
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
