import type {
  ProfileUpdateOtpHimsRequest,
  ProfileUpdateOtpHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { m1ProfileUpdateSendOtp } from "../../lib/m1-profile-update-flow.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function profileEmailUpdateOtpRequest(
  input: ProfileUpdateOtpHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<ProfileUpdateOtpHimsResponse> {
  const email = String(input.email ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    throw new AbdmUseCaseError("email must be a valid address", 400);
  }
  return m1ProfileUpdateSendOtp(deps, iqTenantId, {
    sessionId: input.sessionId,
    channel: "email",
    plainValue: email,
  });
}
