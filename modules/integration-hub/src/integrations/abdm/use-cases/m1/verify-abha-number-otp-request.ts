import type {
  VerifyAbhaNumberOtpHimsRequest,
  VerifyOtpHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { m1LoginOtpSend } from "../../lib/m1-login-otp-flow.js";
import { maskAbhaNumber, normalizeAbhaNumber } from "../../lib/m1-abha-number.js";

export async function verifyAbhaNumberOtpRequest(
  input: AbdmTenantInput<VerifyAbhaNumberOtpHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<VerifyOtpHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const abhaNumber = normalizeAbhaNumber(input.abhaNumber);
  const channel = input.channel ?? "aadhaar";
  const scope =
    channel === "abha-otp"
      ? (["abha-login", "mobile-verify"] as const)
      : (["abha-login", "aadhaar-verify"] as const);
  const otpSystem = channel === "abha-otp" ? "abdm" : "aadhaar";
  return m1LoginOtpSend(deps, iqTenantId, {
    flowKind: "abdm.m1.verify-existing.v1",
    scope: [...scope],
    loginHint: "abha-number",
    otpSystem,
    plainLoginId: abhaNumber,
    initialContext: { abhaNumberMasked: maskAbhaNumber(abhaNumber), verifyChannel: channel },
  });
}
