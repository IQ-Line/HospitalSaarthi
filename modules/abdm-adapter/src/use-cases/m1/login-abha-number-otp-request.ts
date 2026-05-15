import type {
  LoginAbhaNumberOtpHimsRequest,
  LoginAbhaNumberOtpHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { m1LoginOtpSend } from "../../lib/m1-login-otp-flow.js";
import { maskAbhaNumber, normalizeAbhaNumber } from "../../lib/m1-abha-number.js";

export async function loginAbhaNumberOtpRequest(
  input: LoginAbhaNumberOtpHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<LoginAbhaNumberOtpHimsResponse> {
  const abhaNumber = normalizeAbhaNumber(input.abhaNumber);
  const channel = input.channel ?? "aadhaar";
  const scope =
    channel === "abha-otp"
      ? (["abha-login", "mobile-verify"] as const)
      : (["abha-login", "aadhaar-verify"] as const);
  const otpSystem = channel === "abha-otp" ? "abdm" : "aadhaar";
  return m1LoginOtpSend(deps, iqTenantId, {
    flowKind: "abdm.m1.login.v1",
    scope: [...scope],
    loginHint: "abha-number",
    otpSystem,
    plainLoginId: abhaNumber,
    initialContext: {
      abhaNumberMasked: maskAbhaNumber(abhaNumber),
      loginChannel: channel,
    },
  });
}
