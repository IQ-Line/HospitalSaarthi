import type {
  VerifyAbhaAddressOtpHimsRequest,
  VerifyOtpHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { m1LoginOtpSend } from "../../lib/m1-login-otp-flow.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";

export async function verifyAbhaAddressOtpRequest(
  input: AbdmTenantInput<VerifyAbhaAddressOtpHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<VerifyOtpHimsResponse> {
  const iqTenantId = input.iqTenantId;
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
    nhaLoginApi: "phr-abha",
    scope: [...scope],
    loginHint: "abha-address",
    otpSystem,
    plainLoginId: abhaAddress,
    initialContext: {
      // eslint-disable-next-line sonarjs/slow-regex -- linear — `@` is a required literal separator, no nested quantifier; masks a short validated abhaAddress for a log hint only, not ReDoS
      abhaAddressHint: abhaAddress.replace(/(.{2}).+(@.+)/, "$1***$2"),
      verifyChannel: channel,
    },
  });
}
