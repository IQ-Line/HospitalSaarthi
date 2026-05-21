import type {
  EnrolAadhaarOtpHimsResponse,
  NhaEnrolmentRequestOtpBody,
  NhaEnrolmentRequestOtpResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { encryptLoginIdWithAbdmPublicKey } from "../../lib/rsa-abdm-login-id.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";
import { aadhaarMatchesSessionMask } from "../../lib/m1-aadhaar-mask.js";
import { assertM1OtpRateLimit } from "../../lib/m1-otp-rate-limit.js";

export interface EnrolAadhaarOtpResendHimsRequest {
  sessionId: string;
  aadhaarNumber: string;
}

export async function enrolAadhaarOtpResendRequest(
  input: AbdmTenantInput<EnrolAadhaarOtpResendHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<EnrolAadhaarOtpHimsResponse> {
  const iqTenantId = input.iqTenantId;
  assertM1OtpRateLimit(iqTenantId, "enrol-aadhaar-resend");
  const digits = String(input.aadhaarNumber ?? "").replace(/\D/g, "");
  if (!/^\d{12}$/.test(digits)) {
    throw new AbdmUseCaseError("aadhaarNumber must be exactly 12 digits", 400);
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
  if (!aadhaarMatchesSessionMask(digits, session.context["aadhaarMasked"])) {
    throw new AbdmUseCaseError("aadhaarNumber does not match session", 400);
  }
  const cert = await deps.gateway.getPublicCertificate();
  const loginId = encryptLoginIdWithAbdmPublicKey(cert.publicKey, digits);
  // milestone1 Step 2 / Postman: resend body has no prior txnId — use "" like first Send OTP.
  const body: NhaEnrolmentRequestOtpBody = {
    txnId: "",
    scope: ["abha-enrol"],
    loginHint: "aadhaar",
    loginId,
    otpSystem: "aadhaar",
  };
  const nha = await deps.gateway.post<NhaEnrolmentRequestOtpBody, NhaEnrolmentRequestOtpResponse>({
    path: "/v3/enrollment/request/otp",
    body,
  });
  const txnId = nha.txnId;
  if (!txnId || typeof txnId !== "string") {
    throw new Error("NHA enrollment/request/otp resend response missing txnId");
  }
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    txnId,
    contextMerge: {
      nhaOtpMessage: nha.message,
      lastOtpResendAt: new Date().toISOString(),
    },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "OTP sent",
  };
}
