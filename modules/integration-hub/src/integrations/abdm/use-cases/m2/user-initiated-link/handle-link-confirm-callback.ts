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

/**
 * Verify the confirmation OTP: via the SMS provider when a phone + verifier are available
 * (failures log and count as invalid), otherwise by consuming the in-store OTP.
 */
async function verifyLinkOtp(
  deps: AbdmAdapterDeps,
  input: AbdmTenantInput<LinkConfirmRequest & { inboundRequestId: string }>,
  sessionId: string,
  rawPhoneNo: string | undefined,
): Promise<boolean> {
  const phoneNo = rawPhoneNo?.trim();
  if (deps.sms.verifyOtp && phoneNo) {
    try {
      return await deps.sms.verifyOtp({ phoneNo, otp: input.confirmation.token });
    } catch (err: unknown) {
      abdmWarn("abdm.m2.link_confirm.msg91_verify_failed", {
        sessionId,
        message: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
  return deps.linkOtpStore.consume({
    iqTenantId: input.iqTenantId,
    linkRefNumber: input.confirmation.linkRefNumber,
    token: input.confirmation.token,
  });
}

/** Mark care contexts linked and publish them; warn if publish is skipped for a missing profile. */
async function finalizeLinkedCareContexts(
  deps: AbdmAdapterDeps,
  params: {
    iqTenantId: string;
    sessionId: string;
    abhaAddress?: string;
    patientId?: string;
    careContexts: SelectedCareContext[];
  },
): Promise<void> {
  const { iqTenantId, sessionId, abhaAddress, patientId, careContexts } = params;

  if (abhaAddress && careContexts.length > 0) {
    await deps.careContextLinkState.markLinked({
      iqTenantId,
      abhaAddress,
      careContextReferences: careContexts.map((c) => c.referenceNumber),
    });
  }

  if (abhaAddress && patientId && careContexts.length > 0) {
    await publishLinkedCareContexts(
      { iqTenantId, abhaAddress, patientReference: patientId, careContexts },
      deps,
    );
  } else if (careContexts.length > 0) {
    abdmWarn("abdm.m2.link_confirm.publish_skipped_missing_profile", {
      sessionId,
      hasAbhaAddress: Boolean(abhaAddress),
      hasPatientId: Boolean(patientId),
    });
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
          code: ABDM_ERROR_CODES.OTP_MISMATCH,
          message: "OTP attempt limit exceeded",
        },
      },
    });
    return;
  }

  const otpValid = await verifyLinkOtp(deps, input, session.sessionId, ctx.phoneNo);

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
          code: ABDM_ERROR_CODES.OTP_MISMATCH,
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

  await finalizeLinkedCareContexts(deps, {
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    abhaAddress,
    patientId,
    careContexts,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "LINKED",
  });
}
