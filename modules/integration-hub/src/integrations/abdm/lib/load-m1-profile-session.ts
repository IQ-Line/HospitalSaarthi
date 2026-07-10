import type { AbdmSession, M1FlowKind } from "../domain/session.js";
import type { AbdmSessionsPort } from "../ports.js";
import { AbdmUseCaseError } from "./m1-errors.js";

const PROFILE_READ_STATES = new Set<AbdmSession["state"]>([
  "ABHA_CREATED",
  "MOBILE_OTP_VERIFIED",
  "OTP_VERIFIED",
  "ADDRESS_CREATED",
  "LINKED",
]);

export async function loadM1ProfileSession(
  sessions: AbdmSessionsPort,
  iqTenantId: string,
  sessionId: string,
): Promise<AbdmSession<M1FlowKind>> {
  const session = await sessions.findById({ iqTenantId, sessionId });
  if (!session) {
    throw new AbdmUseCaseError("session not found", 404, "NOT_FOUND");
  }
  // Explicit discriminant checks (not a Set.has) so TS narrows `session` to the
  // three M1 flows, whose context is `Record<string, unknown>`.
  if (
    session.flowKind !== "abdm.m1.aadhaar-otp.v1" &&
    session.flowKind !== "abdm.m1.login.v1" &&
    session.flowKind !== "abdm.m1.verify-existing.v1"
  ) {
    throw new AbdmUseCaseError("invalid session flow for profile read", 400);
  }
  if (!PROFILE_READ_STATES.has(session.state)) {
    throw new AbdmUseCaseError(
      `session state ${session.state} is not ready for profile reads`,
      409,
      "CONFLICT",
    );
  }
  if (!session.xToken) {
    throw new AbdmUseCaseError("session missing x_token (complete verify or login first)", 400);
  }
  return session;
}
