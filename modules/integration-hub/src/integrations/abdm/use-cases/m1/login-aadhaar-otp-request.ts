import type {
  LoginAadhaarOtpHimsRequest,
  LoginAbhaNumberOtpHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import type { AbdmTenantInput } from "../../ports.js";
import { m1LoginOtpSend } from "../../lib/m1-login-otp-flow.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";
import { maskAadhaar } from "../../lib/m1-aadhaar-mask.js";

export async function loginAadhaarOtpRequest(
  input: AbdmTenantInput<LoginAadhaarOtpHimsRequest>,
  deps: AbdmAdapterDeps,
): Promise<LoginAbhaNumberOtpHimsResponse> {
  const iqTenantId = input.iqTenantId;
  const digits = String(input.aadhaarNumber ?? "").replace(/\D/g, "");
  if (!/^\d{12}$/.test(digits)) {
    throw new AbdmUseCaseError("aadhaarNumber must be exactly 12 digits", 400);
  }
  return m1LoginOtpSend(deps, iqTenantId, {
    flowKind: "abdm.m1.login.v1",
    scope: ["abha-login", "aadhaar-verify"],
    loginHint: "aadhaar",
    otpSystem: "aadhaar",
    plainLoginId: digits,
    initialContext: { aadhaarMasked: maskAadhaar(digits) },
  });
}
