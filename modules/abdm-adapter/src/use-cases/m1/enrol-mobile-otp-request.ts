import type {
  EnrolMobileOtpHimsRequest,
  EnrolMobileOtpHimsResponse,
  NhaStandaloneMobileEnrolOtpBody,
  NhaStandaloneMobileEnrolOtpResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { encryptLoginIdWithAbdmPublicKey } from "../../lib/rsa-abdm-login-id.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function enrolMobileOtpRequest(
  input: EnrolMobileOtpHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<EnrolMobileOtpHimsResponse> {
  const mobile = String(input.mobile ?? "").replace(/\D/g, "");
  if (mobile.length !== 10) {
    throw new AbdmUseCaseError("mobile must be exactly 10 digits", 400);
  }
  const cert = await deps.gateway.getPublicCertificate();
  const loginId = encryptLoginIdWithAbdmPublicKey(cert.publicKey, mobile);
  const body: NhaStandaloneMobileEnrolOtpBody = {
    txnId: "",
    scope: ["abha-enrol", "mobile-verify"],
    loginHint: "mobile",
    loginId,
    otpSystem: "abdm",
  };
  const nha = await deps.gateway.post<
    NhaStandaloneMobileEnrolOtpBody,
    NhaStandaloneMobileEnrolOtpResponse
  >({
    path: "/v3/enrollment/request/otp",
    body,
  });
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : "";
  if (!txnId) {
    throw new Error("NHA enrollment/request/otp (mobile) response missing txnId");
  }
  const session = await deps.sessions.create({
    iqTenantId,
    flowKind: "abdm.m1.mobile-otp.v1",
    initialContext: { mobileMasked: `******${mobile.slice(-4)}` },
  });
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_REQUESTED",
    txnId,
    contextMerge: { nhaOtpMessage: nha.message },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "OTP sent",
  };
}
