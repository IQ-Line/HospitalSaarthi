import type { AbdmAdapterDeps, AbdmTenantInput } from "../../ports.js";
import { assertM1OtpRateLimit } from "../../lib/m1-otp-rate-limit.js";
import { maskAadhaar } from "../../lib/m1-aadhaar-mask.js";
import { encryptLoginIdWithAbdmPublicKey } from "../../lib/rsa-abdm-login-id.js";
import type {
  EnrolAadhaarOtpHimsRequest,
  EnrolAadhaarOtpHimsResponse,
  NhaEnrolmentRequestOtpBody,
  NhaEnrolmentRequestOtpResponse,
} from "@hims/ts-sdk-abha/protocol/m1";

export async function enrolAadhaarOtpRequest(
  input: AbdmTenantInput<EnrolAadhaarOtpHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<EnrolAadhaarOtpHimsResponse> {
  const { iqTenantId } = input;
  assertM1OtpRateLimit(iqTenantId, "enrol-aadhaar-otp");
  const cert = await deps.gateway.getPublicCertificate();
  const loginId = encryptLoginIdWithAbdmPublicKey(cert.publicKey, input.aadhaarNumber);
  const body: NhaEnrolmentRequestOtpBody = {
    txnId: "",
    scope: ["abha-enrol"],
    loginHint: "aadhaar",
    loginId,
    otpSystem: "aadhaar",
  };
  const nha = await deps.gateway.post<
    NhaEnrolmentRequestOtpBody,
    NhaEnrolmentRequestOtpResponse
  >({
    path: "/v3/enrollment/request/otp",
    body,
  });
  const txnId = nha.txnId;
  if (!txnId || typeof txnId !== "string") {
    throw new Error("NHA enrollment/request/otp response missing txnId");
  }
  const session = await deps.sessions.create({
    iqTenantId,
    flowKind: "abdm.m1.aadhaar-otp.v1",
    initialContext: { aadhaarMasked: maskAadhaar(input.aadhaarNumber) },
  });
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "AADHAAR_OTP_REQUESTED",
    txnId,
    contextMerge: { nhaOtpMessage: nha.message },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "OTP sent",
  };
}
