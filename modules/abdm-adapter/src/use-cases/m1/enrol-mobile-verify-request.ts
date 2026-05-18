import type {
  EnrolMobileVerifyStandaloneHimsRequest,
  EnrolMobileVerifyStandaloneHimsResponse,
  NhaEnrolAuthByAbdmBody,
  NhaEnrolAuthByAbdmResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { abdmOtpTimestampIst } from "../../lib/abdm-otp-timestamp.js";
import { encryptLoginIdWithAbdmPublicKey } from "../../lib/rsa-abdm-login-id.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function enrolMobileVerifyRequest(
  input: AbdmTenantInput<EnrolMobileVerifyStandaloneHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<EnrolMobileVerifyStandaloneHimsResponse> {
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
  if (session.flowKind !== "abdm.m1.mobile-otp.v1") {
    throw new AbdmUseCaseError("invalid session flow", 400);
  }
  if (session.state !== "OTP_REQUESTED") {
    throw new AbdmUseCaseError(
      `session state must be OTP_REQUESTED, got ${session.state}`,
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId", 400);
  }
  const cert = await deps.gateway.getPublicCertificate();
  const otpValue = encryptLoginIdWithAbdmPublicKey(cert.publicKey, otp);
  const body: NhaEnrolAuthByAbdmBody = {
    scope: ["abha-enrol", "mobile-verify"],
    authData: {
      authMethods: ["otp"],
      otp: {
        timeStamp: abdmOtpTimestampIst(),
        txnId: session.txnId,
        otpValue,
      },
    },
  };
  const nha = await deps.gateway.post<NhaEnrolAuthByAbdmBody, NhaEnrolAuthByAbdmResponse>({
    path: "/v3/enrollment/auth/byAbdm",
    body,
  });
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : session.txnId;
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_VERIFIED",
    txnId,
    contextMerge: { mobileEnrolVerifyResponse: nha },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "Mobile enrolment verified",
  };
}
