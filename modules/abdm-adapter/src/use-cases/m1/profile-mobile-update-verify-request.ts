import type {
  ProfileUpdateVerifyHimsRequest,
  ProfileUpdateVerifyHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { m1ProfileUpdateVerifyOtp } from "../../lib/m1-profile-update-flow.js";

export async function profileMobileUpdateVerifyRequest(
  input: ProfileUpdateVerifyHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<ProfileUpdateVerifyHimsResponse> {
  return m1ProfileUpdateVerifyOtp(deps, iqTenantId, input);
}
