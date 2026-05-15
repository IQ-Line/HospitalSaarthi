import type { AbdmSession } from "../domain/session.js";
import { AbdmUseCaseError } from "./m1-errors.js";

/** After Aadhaar verify + enrol-chain mobile OTP, address steps are allowed. */
export function assertAadhaarEnrolMobileVerified(session: AbdmSession): void {
  if (session.flowKind !== "abdm.m1.aadhaar-otp.v1") {
    throw new AbdmUseCaseError("invalid session flow", 400);
  }
  if (session.state !== "OTP_VERIFIED") {
    throw new AbdmUseCaseError(
      `complete mobile-verify before ABHA address (expected OTP_VERIFIED, got ${session.state})`,
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId", 400);
  }
}
