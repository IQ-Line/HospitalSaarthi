import type { AbdmSession } from "../../domain/session.js";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export interface SessionGetHimsResponse {
  sessionId: string;
  flowKind: AbdmSession["flowKind"];
  state: AbdmSession["state"];
  hasTxnId: boolean;
  hasXToken: boolean;
  /** UI hint for the next platform call in the enrolment chain. */
  nextStep: string;
  updatedAt: string;
}

function suggestNextStep(session: AbdmSession): string {
  if (session.flowKind === "abdm.m1.mobile-otp.v1") {
    if (session.state === "OTP_REQUESTED") return "POST /m1/enrol/mobile/verify";
    return "POST /m1/enrol/mobile/otp";
  }
  if (session.flowKind === "abdm.m1.verify-existing.v1") {
    if (session.state === "OTP_REQUESTED") return "POST /m1/verify/abha-number/verify or /m1/verify/abha-address/verify";
    if (session.xToken) return "GET /m1/profile";
    return "POST /m1/verify/abha-number/otp or /m1/verify/abha-address/otp";
  }
  if (session.flowKind === "abdm.m1.login.v1") {
    if (session.state === "INIT") return "POST /m1/login/otp";
    if (session.state === "OTP_REQUESTED") return "POST /m1/login/verify";
    if (session.xToken) return "GET /m1/profile or GET /m1/profile/abha-card";
    return "POST /m1/login/otp";
  }
  switch (session.state) {
    case "INIT":
      return "POST /m1/enrol/aadhaar/otp";
    case "AADHAAR_OTP_REQUESTED":
      return "POST /m1/enrol/aadhaar/verify (or POST /m1/enrol/aadhaar/otp/resend if OTP expired)";
    case "ABHA_CREATED":
      return "POST /m1/enrol/mobile-verify/otp then POST /m1/enrol/mobile-verify/verify (required before ABHA address)";
    case "MOBILE_OTP_REQUESTED":
      return "POST /m1/enrol/mobile-verify/verify";
    case "MOBILE_OTP_VERIFIED":
      return "GET /m1/abha-address/suggestions then POST /m1/abha-address";
    case "ADDRESS_CREATED":
    case "LINKED":
      return "GET /m1/profile or GET /m1/profile/abha-card";
    default:
      return "contact support — unexpected session state";
  }
}

export async function sessionGetRequest(
  input: AbdmTenantInput<{ sessionId: string }>,
  deps: AbdmAdapterDeps,
): Promise<SessionGetHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const session = await deps.sessions.findById({
    iqTenantId,
    sessionId: input.sessionId,
  });
  if (!session) {
    throw new AbdmUseCaseError("session not found", 404, "NOT_FOUND");
  }
  return {
    sessionId: session.sessionId,
    flowKind: session.flowKind,
    state: session.state,
    hasTxnId: Boolean(session.txnId),
    hasXToken: Boolean(session.xToken),
    nextStep: suggestNextStep(session),
    updatedAt: session.updatedAt.toISOString(),
  };
}
