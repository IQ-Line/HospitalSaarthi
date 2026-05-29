import type {
  LoginVerifyUserHimsRequest,
  LoginVerifyUserHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { m1LoginVerifyUser } from "../../lib/m1-login-verify-user.js";
import type { M1OtpSessionFlowKind } from "../../lib/m1-login-otp-flow.js";

export async function loginVerifyUserRequest(
  input: AbdmTenantInput<LoginVerifyUserHimsRequest>,
  deps: AbdmAdapterDeps,
  expectedFlowKind: M1OtpSessionFlowKind = "abdm.m1.login.v1",
): Promise<LoginVerifyUserHimsResponse> {
  return m1LoginVerifyUser(deps, input.iqTenantId, input, expectedFlowKind);
}
