import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { encryptLoginIdWithAbdmPublicKey } from "../../lib/rsa-abdm-login-id.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";
import {
  NHA_ABHA_ENROLMENT_CONSENT,
  type EnrolAadhaarVerifyHimsRequest,
  type EnrolAadhaarVerifyHimsResponse,
  type NhaEnrolByAadhaarBody,
  type NhaEnrolByAadhaarResponse,
  extractEnrolmentProfileTokens,
} from "@hims/ts-sdk-abha/protocol/m1";
import { snapshotEnrolByAadhaarResponse } from "../../lib/nha-enrol-context-snapshot.js";
import { resolveSkipEnrolMobileVerify } from "../../lib/m1-enrol-linked-mobile.js";

export async function enrolAadhaarVerifyRequest(
  input: AbdmTenantInput<EnrolAadhaarVerifyHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<EnrolAadhaarVerifyHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const otp = String(input.otp ?? "").trim();
  if (!/^\d{6}$/.test(otp)) {
    throw new AbdmUseCaseError("otp must be exactly 6 digits", 400);
  }
  const session = await deps.sessions.findById({
    iqTenantId,
    sessionId: input.sessionId,
  });
  if (!session) {
    throw new AbdmUseCaseError("session not found", 404, "NOT_FOUND");
  }
  if (session.flowKind !== "abdm.m1.aadhaar-otp.v1") {
    throw new AbdmUseCaseError("invalid session flow", 400);
  }
  if (session.state !== "AADHAAR_OTP_REQUESTED") {
    throw new AbdmUseCaseError(
      `session state must be AADHAAR_OTP_REQUESTED, got ${session.state}`,
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId", 400);
  }
  const mobileDigits = String(input.mobile ?? "").replace(/\D/g, "");
  if (mobileDigits.length !== 10) {
    throw new AbdmUseCaseError(
      "mobile is required (10 digits) — primary number for ABHA; use the mobile where you received the Aadhaar OTP",
      400,
    );
  }
  const mobile = mobileDigits;
  const cert = await deps.gateway.getPublicCertificate();
  const otpValue = encryptLoginIdWithAbdmPublicKey(cert.publicKey, otp);
  const body: NhaEnrolByAadhaarBody = {
    authData: {
      authMethods: ["otp"],
      otp: {
        txnId: session.txnId,
        otpValue,
        mobile,
      },
    },
    consent: { ...NHA_ABHA_ENROLMENT_CONSENT },
  };
  const nha = await deps.gateway.post<NhaEnrolByAadhaarBody, NhaEnrolByAadhaarResponse>({
    path: "/v3/enrollment/enrol/byAadhaar",
    body,
  });
  const { xToken, tToken } = extractEnrolmentProfileTokens(nha);
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : "";
  if (!txnId) {
    throw new Error("NHA enrol/byAadhaar response missing txnId");
  }
  const isNew =
    typeof nha.new === "boolean"
      ? nha.new
      : typeof nha.isNew === "boolean"
        ? nha.isNew
        : undefined;
  const mobileVerifySkipped = resolveSkipEnrolMobileVerify(
    input.useAadhaarLinkedMobile,
    nha,
  );
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: mobileVerifySkipped ? "MOBILE_OTP_VERIFIED" : "ABHA_CREATED",
    txnId,
    xToken,
    ...(tToken ? { tToken } : {}),
    contextMerge: {
      enrolSnapshot: snapshotEnrolByAadhaarResponse(nha),
      enrolPrimaryMobile: mobile,
      ...(mobileVerifySkipped
        ? {
            mobileVerifiedVia: "aadhaar-linked",
            mobileVerifiedAt: new Date().toISOString(),
          }
        : {}),
    },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    healthIdNumber: nha.healthIdNumber,
    isNew,
    mobileVerifySkipped,
    message: typeof nha.message === "string" ? nha.message : "ABHA enrolment step completed",
  };
}
