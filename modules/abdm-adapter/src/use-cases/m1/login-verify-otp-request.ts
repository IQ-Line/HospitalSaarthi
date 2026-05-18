import type {
  LoginVerifyHimsRequest,
  LoginVerifyHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { m1LoginOtpVerify } from "../../lib/m1-login-otp-flow.js";

export async function loginVerifyOtpRequest(
  input: AbdmTenantInput<LoginVerifyHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<LoginVerifyHimsResponse> {
  const iqTenantId = input.iqTenantId;
  return m1LoginOtpVerify(deps, iqTenantId, input, "abdm.m1.login.v1");
}
