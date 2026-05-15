import type {
  LoginVerifyHimsRequest,
  LoginVerifyHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { m1LoginOtpVerify } from "../../lib/m1-login-otp-flow.js";

export async function loginVerifyOtpRequest(
  input: LoginVerifyHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<LoginVerifyHimsResponse> {
  return m1LoginOtpVerify(deps, iqTenantId, input, "abdm.m1.login.v1");
}
