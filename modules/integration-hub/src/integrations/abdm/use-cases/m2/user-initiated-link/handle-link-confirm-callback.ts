import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import type { LinkConfirmRequest, OnLinkConfirmRequest } from "@hims/ts-sdk-abha/protocol/m2";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import { toLinkCareContextHiType } from "../../../lib/m2-hi-type-mapper.js";
import { addContextsPublish } from "../add-contexts/publish.js";

type SelectedCareContext = {
  referenceNumber: string;
  display: string;
  hiType?: string;
};

const PUBLISH_DELAY_MS = 2000;
const DEFAULT_LINK_OTP_MAX_ATTEMPTS = 5;

function linkOtpMaxAttempts(): number {
  const parsed = Number(process.env["ABDM_LINK_OTP_MAX_ATTEMPTS"] ?? DEFAULT_LINK_OTP_MAX_ATTEMPTS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LINK_OTP_MAX_ATTEMPTS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOnConfirmPatientPayload(
  careContexts: SelectedCareContext[],
  patientId: string,
  display: string,
): OnLinkConfirmRequest["patient"] {
  const byHiType = new Map<string, SelectedCareContext[]>();
  for (const ctx of careContexts) {
    const hiType = toLinkCareContextHiType(ctx.hiType ?? "OPCONSULTATION");
    const group = byHiType.get(hiType);
    if (group) group.push(ctx);
    else byHiType.set(hiType, [ctx]);
  }

  return Array.from(byHiType.entries()).map(([hiType, items]) => ({
    referenceNumber: patientId,
    display,
    careContexts: items.map((c) => ({
      referenceNumber: c.referenceNumber,
      display: c.display,
    })),
    hiType,
    count: items.length,
  }));
}

async function publishLinkedCareContexts(
  input: {
    iqTenantId: string;
    abhaAddress: string;
    patientReference: string;
    careContexts: SelectedCareContext[];
  },
  deps: AbdmAdapterDeps,
): Promise<void> {
  let publishIndex = 0;
  for (const ctx of input.careContexts) {
    if (publishIndex > 0) {
      await delay(PUBLISH_DELAY_MS);
    }
    publishIndex += 1;
    try {
      await addContextsPublish(
        {
          iqTenantId: input.iqTenantId,
          abhaAddress: input.abhaAddress,
          patientReference: input.patientReference,
          careContextReference: ctx.referenceNumber,
          hiType: ctx.hiType ?? "OPCONSULTATION",
        },
        deps,
      );
    } catch (err: unknown) {
      abdmWarn("abdm.m2.link_confirm.publish_failed", {
        careContextReference: ctx.referenceNumber,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export async function handleLinkConfirmCallback(
  input: AbdmTenantInput<LinkConfirmRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findUserLinkByLinkRefNumber({
    iqTenantId: input.iqTenantId,
    linkRefNumber: input.confirmation.linkRefNumber,
  });
  if (!session) return;

  const ctx = session.context as {
    phoneNo?: string;
    patientId?: string;
    abhaAddress?: string;
    careContexts?: SelectedCareContext[];
    otpAttemptCount?: number;
  };

  const maxAttempts = linkOtpMaxAttempts();
  const attemptCount = (ctx.otpAttemptCount ?? 0) + 1;
  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    contextMerge: { otpAttemptCount: attemptCount },
  });

  if (attemptCount > maxAttempts) {
    abdmWarn("abdm.m2.link_confirm.otp_attempts_exceeded", {
      sessionId: session.sessionId,
      linkRefNumber: input.confirmation.linkRefNumber,
      attemptCount,
      maxAttempts,
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
      contextMerge: {
        error: {
          code: ABDM_ERROR_CODES.INVALID_REQUEST,
          message: "OTP attempt limit exceeded",
        },
      },
    });
    return;
  }

  let otpValid = false;
  const phoneNo = ctx.phoneNo?.trim();
  if (deps.sms.verifyOtp && phoneNo) {
    try {
      otpValid = await deps.sms.verifyOtp({
        phoneNo,
        otp: input.confirmation.token,
      });
    } catch (err: unknown) {
      abdmWarn("abdm.m2.link_confirm.msg91_verify_failed", {
        sessionId: session.sessionId,
        message: err instanceof Error ? err.message : String(err),
      });
      otpValid = false;
    }
  } else {
    otpValid = await deps.linkOtpStore.consume({
      iqTenantId: input.iqTenantId,
      linkRefNumber: input.confirmation.linkRefNumber,
      token: input.confirmation.token,
    });
  }

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

  const careContexts = ctx.careContexts ?? [];
  const patientId = ctx.patientId?.trim();
  const abhaAddress = ctx.abhaAddress?.trim();
  const display = abhaAddress ?? patientId ?? "patient";

  const patientPayload =
    careContexts.length > 0 && patientId
      ? buildOnConfirmPatientPayload(careContexts, patientId, display)
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

  if (abhaAddress && careContexts.length > 0) {
    await deps.careContextLinkState.markLinked({
      iqTenantId: input.iqTenantId,
      abhaAddress,
      careContextReferences: careContexts.map((c) => c.referenceNumber),
    });
  }

  if (abhaAddress && patientId && careContexts.length > 0) {
    await publishLinkedCareContexts(
      {
        iqTenantId: input.iqTenantId,
        abhaAddress,
        patientReference: patientId,
        careContexts,
      },
      deps,
    );
  } else if (careContexts.length > 0) {
    abdmWarn("abdm.m2.link_confirm.publish_skipped_missing_profile", {
      sessionId: session.sessionId,
      hasAbhaAddress: Boolean(abhaAddress),
      hasPatientId: Boolean(patientId),
    });
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "LINKED",
  });
}
