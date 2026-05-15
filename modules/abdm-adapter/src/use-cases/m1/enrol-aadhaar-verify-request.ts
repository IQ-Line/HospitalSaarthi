import type { AbdmAdapterDeps } from "../../ports.js";
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

export async function enrolAadhaarVerifyRequest(
  input: EnrolAadhaarVerifyHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<EnrolAadhaarVerifyHimsResponse> {
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
  let mobile: string | undefined;
  if (input.mobile !== undefined && input.mobile !== null && String(input.mobile).trim() !== "") {
    const m = String(input.mobile).replace(/\D/g, "");
    if (m.length !== 10) {
      throw new AbdmUseCaseError("mobile must be 10 digits when provided", 400);
    }
    mobile = m;
  }
  const cert = await deps.gateway.getPublicCertificate();
  const otpValue = encryptLoginIdWithAbdmPublicKey(cert.publicKey, otp);
  const body: NhaEnrolByAadhaarBody = {
    authData: {
      authMethods: ["otp"],
      otp: {
        txnId: session.txnId,
        otpValue,
        ...(mobile ? { mobile } : {}),
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
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "ABHA_CREATED",
    txnId,
    xToken,
    ...(tToken ? { tToken } : {}),
    contextMerge: {
      enrolSnapshot: snapshotEnrolByAadhaarResponse(nha),
    },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    healthIdNumber: nha.healthIdNumber,
    isNew,
    message: typeof nha.message === "string" ? nha.message : "ABHA enrolment step completed",
  };
}
