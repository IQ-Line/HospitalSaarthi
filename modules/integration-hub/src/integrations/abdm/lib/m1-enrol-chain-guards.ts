import type { AbdmSession } from "../domain/session.js";
import { AbdmUseCaseError } from "./m1-errors.js";

/** After Aadhaar verify + enrol-chain mobile OTP, address steps are allowed. */
export function assertAadhaarEnrolMobileVerified(
  session: AbdmSession,
): asserts session is AbdmSession<"abdm.m1.aadhaar-otp.v1"> & { txnId: string } {
  if (session.flowKind !== "abdm.m1.aadhaar-otp.v1") {
    throw new AbdmUseCaseError("invalid session flow", 400);
  }
  if (session.state !== "MOBILE_OTP_VERIFIED") {
    throw new AbdmUseCaseError(
      `complete mobile-verify before ABHA address (expected MOBILE_OTP_VERIFIED, got ${session.state})`,
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId", 400);
  }
}
