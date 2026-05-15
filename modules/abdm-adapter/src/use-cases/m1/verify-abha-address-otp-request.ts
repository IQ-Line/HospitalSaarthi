import type {
  VerifyAbhaAddressOtpHimsRequest,
  VerifyOtpHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { m1LoginOtpSend } from "../../lib/m1-login-otp-flow.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function verifyAbhaAddressOtpRequest(
  input: VerifyAbhaAddressOtpHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<VerifyOtpHimsResponse> {
  const abhaAddress = String(input.abhaAddress ?? "").trim();
  if (!abhaAddress.includes("@")) {
    throw new AbdmUseCaseError("abhaAddress must include @ (e.g. user@sbx)", 400);
  }
  const channel = input.channel ?? "mobile";
  const scope =
    channel === "aadhaar"
      ? (["abha-address-login", "aadhaar-verify"] as const)
      : (["abha-address-login", "mobile-verify"] as const);
  const otpSystem = channel === "aadhaar" ? "aadhaar" : "abdm";
  return m1LoginOtpSend(deps, iqTenantId, {
    flowKind: "abdm.m1.verify-existing.v1",
    scope: [...scope],
    loginHint: "abha-address",
    otpSystem,
    plainLoginId: abhaAddress,
    initialContext: {
      abhaAddressHint: abhaAddress.replace(/(.{2}).+(@.+)/, "$1***$2"),
      verifyChannel: channel,
    },
  });
}
