import type {
  LoginVerifyUserHimsResponse,
  NhaLoginVerifyUserBody,
  NhaLoginVerifyUserResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import { extractLoginProfileTokens } from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../ports.js";
import { AbdmUseCaseError } from "./m1-errors.js";
import { normalizeAbhaNumber } from "./m1-abha-number.js";
import { nhaLoginTTokenHeaders } from "./nha-login-headers.js";
import type { M1OtpSessionFlowKind } from "./m1-login-otp-flow.js";
import {
  LOGIN_NEEDS_USER_VERIFY_KEY,
  LOGIN_TRANSFER_TOKEN_KEY,
} from "./m1-login-session-context.js";

export async function m1LoginVerifyUser(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  input: { sessionId: string; abhaNumber: string },
  expectedFlowKind: M1OtpSessionFlowKind,
): Promise<LoginVerifyUserHimsResponse> {
  const session = await deps.sessions.findById({
    iqTenantId,
    sessionId: input.sessionId,
  });
  if (!session) {
    throw new AbdmUseCaseError("session not found", 404, "NOT_FOUND");
  }
  if (session.flowKind !== expectedFlowKind) {
    throw new AbdmUseCaseError("invalid session flow", 400);
  }
  if (session.state !== "OTP_VERIFIED") {
    throw new AbdmUseCaseError(
      `session state must be OTP_VERIFIED, got ${session.state}`,
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId", 400);
  }
  const transferToken = session.context[LOGIN_TRANSFER_TOKEN_KEY];
  if (typeof transferToken !== "string" || !transferToken) {
    throw new AbdmUseCaseError(
      "session has no pending account selection; login verify/user not required",
      409,
      "CONFLICT",
    );
  }

  const abhaNumber = normalizeAbhaNumber(input.abhaNumber);
  const body: NhaLoginVerifyUserBody = {
    ABHANumber: abhaNumber,
    txnId: session.txnId,
  };
  const nha = await deps.gateway.post<NhaLoginVerifyUserBody, NhaLoginVerifyUserResponse>({
    path: "/v3/profile/login/verify/user",
    body,
    headers: nhaLoginTTokenHeaders(transferToken),
  });
  const { xToken, tToken } = extractLoginProfileTokens(nha);
  const txnId = typeof nha.token === "string" && nha.token ? session.txnId : session.txnId;

  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_VERIFIED",
    txnId,
    xToken,
    ...(tToken ? { tToken } : {}),
    contextMerge: {
      [LOGIN_NEEDS_USER_VERIFY_KEY]: false,
      [LOGIN_TRANSFER_TOKEN_KEY]: undefined,
      loginSelectedAbhaNumber: abhaNumber,
      loginUserVerifiedAt: new Date().toISOString(),
    },
  });

  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "User verified",
  };
}
