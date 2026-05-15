import type {
  EnrolMobileVerifySendOtpHimsRequest,
  EnrolMobileVerifySendOtpHimsResponse,
  NhaEnrolMobileOtpDuringEnrolBody,
  NhaEnrolMobileOtpDuringEnrolResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { encryptLoginIdWithAbdmPublicKey } from "../../lib/rsa-abdm-login-id.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function enrolMobileVerifySendOtpRequest(
  input: EnrolMobileVerifySendOtpHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<EnrolMobileVerifySendOtpHimsResponse> {
  const mobile = String(input.mobile ?? "").replace(/\D/g, "");
  if (mobile.length !== 10) {
    throw new AbdmUseCaseError("mobile must be exactly 10 digits", 400);
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
  if (session.state !== "ABHA_CREATED") {
    throw new AbdmUseCaseError(
      `session state must be ABHA_CREATED, got ${session.state}`,
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId (complete Aadhaar verify first)", 400);
  }
  const cert = await deps.gateway.getPublicCertificate();
  const loginId = encryptLoginIdWithAbdmPublicKey(cert.publicKey, mobile);
  const body: NhaEnrolMobileOtpDuringEnrolBody = {
    txnId: session.txnId,
    scope: ["abha-enrol", "mobile-verify"],
    loginHint: "mobile",
    loginId,
    otpSystem: "abdm",
  };
  const nha = await deps.gateway.post<NhaEnrolMobileOtpDuringEnrolBody, NhaEnrolMobileOtpDuringEnrolResponse>({
    path: "/v3/enrollment/request/otp",
    body,
  });
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : "";
  if (!txnId) {
    throw new Error("NHA enrollment/request/otp (mobile) response missing txnId");
  }
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    txnId,
    contextMerge: {
      mobileVerifyMasked: `******${mobile.slice(-4)}`,
      mobileVerifyOtpMessage: nha.message,
    },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "OTP sent",
  };
}
