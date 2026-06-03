import type {
  ProfileUpdateVerifyHimsRequest,
  ProfileUpdateVerifyHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { m1ProfileUpdateVerifyOtp } from "../../lib/m1-profile-update-flow.js";

export async function profileMobileUpdateVerifyRequest(
  input: AbdmTenantInput<ProfileUpdateVerifyHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<ProfileUpdateVerifyHimsResponse> {
  const iqTenantId = input.iqTenantId;
  return m1ProfileUpdateVerifyOtp(deps, iqTenantId, input);
}
