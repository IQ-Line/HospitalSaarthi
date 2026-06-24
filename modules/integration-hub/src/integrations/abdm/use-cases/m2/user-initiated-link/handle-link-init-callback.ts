import { randomUUID } from "node:crypto";
import type { LinkInitRequest, OnLinkInitRequest } from "@hims/ts-sdk-abha/protocol/m2";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import {
  generateLinkOtp6,
  parseCommunicationExpiry,
} from "../../../lib/link-otp-store.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";

type SelectedCareContext = {
  referenceNumber: string;
  display: string;
  hiType?: string;
};

/** PHR user-initiated init sends `patient[]` care-context picks, not `link` (LIMS parity). */
function extractSelectedCareContexts(
  input: LinkInitRequest,
): SelectedCareContext[] {
  const patients = input.patient;
  if (!Array.isArray(patients) || patients.length === 0) return [];

  const selected: SelectedCareContext[] = [];
  for (const block of patients) {
    for (const cc of block.careContexts ?? []) {
      const ref = cc.referenceNumber?.trim();
      if (!ref) continue;
      selected.push({
        referenceNumber: ref,
        display: cc.display?.trim() || ref,
        hiType: block.hiType,
      });
    }
  }
  return selected;
}

async function resolveLinkInitPhone(
  deps: AbdmAdapterDeps,
  input: {
    iqTenantId: string;
    abhaAddress?: string;
    sessionCtx: {
      phoneNo?: string;
      patientId?: string;
      abhaAddress?: string;
    };
  },
): Promise<string | undefined> {
  if (input.sessionCtx.phoneNo?.trim()) return input.sessionCtx.phoneNo.trim();

  const patientId = input.sessionCtx.patientId?.trim();
  if (patientId) {
    const profile = await deps.empi.findM2PatientProfile({
      iqTenantId: input.iqTenantId,
      patientId,
    });
    if (profile?.phoneNo?.trim()) return profile.phoneNo.trim();

    const fromRegistration = await deps.registration.findM2PatientProfile({
      iqTenantId: input.iqTenantId,
      patientId,
    });
    if (fromRegistration?.phoneNo?.trim()) return fromRegistration.phoneNo.trim();
  }

  const abha = (input.abhaAddress ?? input.sessionCtx.abhaAddress)?.trim();
  if (abha) {
    const match = await deps.empi.findPatientByAbhaAddress({
      iqTenantId: input.iqTenantId,
      abhaAddress: abha,
    });
    if (match?.patientId) {
      const profile = await deps.empi.findM2PatientProfile({
        iqTenantId: input.iqTenantId,
        patientId: match.patientId,
      });
      if (profile?.phoneNo?.trim()) return profile.phoneNo.trim();
    }
  }

  return deps.defaultSmsPhoneNo;
}

export async function handleLinkInitCallback(
  input: AbdmTenantInput<LinkInitRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findUserLinkByTransactionId({
    iqTenantId: input.iqTenantId,
    transactionId: input.transactionId,
  });
  if (!session) return;

  const sessionCtx = session.context as {
    phoneNo?: string;
    patientId?: string;
    abhaAddress?: string;
    careContexts?: SelectedCareContext[];
  };

  const selectedContexts = extractSelectedCareContexts(input);
  const abhaAddress = input.abhaAddress?.trim() || sessionCtx.abhaAddress;
  const careContexts =
    selectedContexts.length > 0 ? selectedContexts : (sessionCtx.careContexts ?? []);

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "LINK_INIT_RECEIVED",
    contextMerge: {
      abhaAddress,
      careContexts,
    },
  });

  const linkRefNumber = randomUUID();
  const communicationExpiry =
    input.link?.meta?.communicationExpiry ??
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const expiresAt = parseCommunicationExpiry(communicationExpiry);

  const phoneNo = await resolveLinkInitPhone(deps, {
    iqTenantId: input.iqTenantId,
    abhaAddress,
    sessionCtx,
  });

  const usesProviderOtp = typeof deps.sms.verifyOtp === "function";

  if (usesProviderOtp) {
    if (phoneNo) {
      await deps.sms.sendOtp({
        phoneNo,
        message: "ABDM care-context link OTP",
      });
      await deps.sessions.patch({
        iqTenantId: input.iqTenantId,
        sessionId: session.sessionId,
        contextMerge: { phoneNo },
      });
    } else {
      abdmWarn("abdm.m2.link_init.otp_not_sent", {
        sessionId: session.sessionId,
        reason: "no phone from discover/EMPI/registration for MSG91",
      });
    }
  } else {
    const otp = generateLinkOtp6();
    await deps.linkOtpStore.put({
      iqTenantId: input.iqTenantId,
      linkRefNumber,
      otp,
      expiresAt,
    });

    if (phoneNo) {
      await deps.sms.sendOtp({
        phoneNo,
        message: `Your ABDM care-context link OTP is ${otp}. Valid until ${expiresAt.toISOString()}.`,
      });
      await deps.sessions.patch({
        iqTenantId: input.iqTenantId,
        sessionId: session.sessionId,
        contextMerge: { phoneNo },
      });
    } else {
      abdmWarn("abdm.m2.link_init.otp_not_sent", {
        sessionId: session.sessionId,
        reason: "no phone from EMPI/session or ABDM_DEFAULT_SMS_PHONE",
      });
    }

    abdmWarn("abdm.m2.link_init.otp_generated", {
      sessionId: session.sessionId,
      linkRefNumber,
      otp,
      phoneMasked: phoneNo?.replace(/\d(?=\d{4})/g, "*") ?? null,
    });
  }

  const outboundLink = {
    referenceNumber: linkRefNumber,
    authenticationType: input.link?.authenticationType ?? "MEDIATE",
    meta: {
      communicationMedium: input.link?.meta?.communicationMedium ?? "MOBILE",
      communicationHint: input.link?.meta?.communicationHint ?? "OTP",
      communicationExpiry,
    },
  };

  const onInitBody: OnLinkInitRequest = {
    transactionId: input.transactionId,
    link: outboundLink,
    response: { requestId: input.inboundRequestId },
  };

  await deps.gateway.post({
    path: M2_GATEWAY_PATHS.onLinkInit,
    body: onInitBody,
    target: "gateway",
    requestId: input.inboundRequestId,
    xHipId: deps.xHipId,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_DISPATCHED",
    contextMerge: { linkRefNumber },
  });
}
