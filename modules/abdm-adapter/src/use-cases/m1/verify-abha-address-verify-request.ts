import type {
  VerifyConfirmHimsRequest,
  VerifyConfirmHimsResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../../ports.js";
import { m1LoginOtpVerify } from "../../lib/m1-login-otp-flow.js";

export async function verifyAbhaAddressVerifyRequest(
  input: VerifyConfirmHimsRequest,
  deps: AbdmAdapterDeps,
  iqTenantId: string,
): Promise<VerifyConfirmHimsResponse> {
  return m1LoginOtpVerify(deps, iqTenantId, input, "abdm.m1.verify-existing.v1");
}
