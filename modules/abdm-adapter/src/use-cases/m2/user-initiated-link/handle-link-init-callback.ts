import { randomUUID } from "node:crypto";
import type { LinkInitRequest, OnLinkInitRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import {
  generateLinkOtp6,
  parseCommunicationExpiry,
} from "../../../lib/link-otp-store.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";

export async function handleLinkInitCallback(
  input: AbdmTenantInput<LinkInitRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const session = await deps.sessions.findUserLinkByTransactionId({
    iqTenantId: input.iqTenantId,
    transactionId: input.transactionId,
  });
  if (!session) return;

  const linkRefNumber = randomUUID();
  const otp = generateLinkOtp6();
  const expiresAt = parseCommunicationExpiry(input.link.meta?.communicationExpiry);

  deps.linkOtpStore.put({ linkRefNumber, otp, expiresAt });

  const ctx = session.context as {
    phoneNo?: string;
    patientId?: string;
  };
  const phoneNo = ctx.phoneNo ?? deps.defaultSmsPhoneNo;
  if (phoneNo) {
    await deps.sms.sendOtp({
      phoneNo,
      message: `Your ABDM care-context link OTP is ${otp}. Valid until ${expiresAt.toISOString()}.`,
    });
  } else {
    abdmWarn("abdm.m2.link_init.otp_not_sent", {
      sessionId: session.sessionId,
      reason: "no phone on session or ABDM_DEFAULT_SMS_PHONE",
    });
  }

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
    contextMerge: { linkRefNumber },
  });
}
