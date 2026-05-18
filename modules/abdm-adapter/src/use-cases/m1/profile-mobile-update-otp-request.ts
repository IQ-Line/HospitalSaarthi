import type {
  ProfileUpdateOtpHimsRequest,
  ProfileUpdateOtpHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { m1ProfileUpdateSendOtp } from "../../lib/m1-profile-update-flow.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function profileMobileUpdateOtpRequest(
  input: AbdmTenantInput<ProfileUpdateOtpHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<ProfileUpdateOtpHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const mobile = String(input.mobile ?? "").replace(/\D/g, "");
  if (mobile.length !== 10) {
    throw new AbdmUseCaseError("mobile must be exactly 10 digits", 400);
  }
  return m1ProfileUpdateSendOtp(deps, iqTenantId, {
    sessionId: input.sessionId,
    channel: "mobile",
    plainValue: mobile,
  });
}
