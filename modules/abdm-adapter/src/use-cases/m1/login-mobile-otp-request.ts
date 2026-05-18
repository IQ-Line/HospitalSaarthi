import type {
  LoginMobileOtpHimsRequest,
  LoginAbhaNumberOtpHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { m1LoginOtpSend } from "../../lib/m1-login-otp-flow.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function loginMobileOtpRequest(
  input: AbdmTenantInput<LoginMobileOtpHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<LoginAbhaNumberOtpHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const mobile = String(input.mobile ?? "").replace(/\D/g, "");
  if (mobile.length !== 10) {
    throw new AbdmUseCaseError("mobile must be exactly 10 digits", 400);
  }
  return m1LoginOtpSend(deps, iqTenantId, {
    flowKind: "abdm.m1.login.v1",
    scope: ["abha-login", "mobile-verify"],
    loginHint: "mobile",
    otpSystem: "abdm",
    plainLoginId: mobile,
    initialContext: { mobileMasked: `******${mobile.slice(-4)}` },
  });
}
