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
  LOGIN_API_VARIANT_KEY,
  LOGIN_NEEDS_USER_VERIFY_KEY,
  LOGIN_PENDING_REFRESH_TOKEN_KEY,
  LOGIN_SCOPES_CONTEXT_KEY,
  LOGIN_TRANSFER_TOKEN_KEY,
} from "./m1-login-session-context.js";
import { parseLoginApiVariant } from "./m1-nha-login-paths.js";

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
  const loginApi = parseLoginApiVariant(session.context[LOGIN_API_VARIANT_KEY]);
  if (loginApi === "phr-abha") {
    throw new AbdmUseCaseError(
      "verify/user is not used for ABHA address login; after POST /m1/verify/abha-address/verify call GET /m1/profile?sessionId=...",
      409,
      "CONFLICT",
    );
  }
  if (session.context[LOGIN_NEEDS_USER_VERIFY_KEY] === false) {
    throw new AbdmUseCaseError(
      "session already has profile tokens from verify; use GET /m1/profile — verify/user is only for mobile login with multiple ABHA numbers",
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId", 400);
  }
  const transferToken = session.context[LOGIN_TRANSFER_TOKEN_KEY];
  if (typeof transferToken !== "string" || !transferToken.trim()) {
    throw new AbdmUseCaseError(
      "session has no pending account selection; call verify OTP first and ensure the response has needsUserSelection true and accounts[]",
      409,
      "CONFLICT",
    );
  }

  const abhaNumber = normalizeAbhaNumber(input.abhaNumber);
  const scopes = session.context[LOGIN_SCOPES_CONTEXT_KEY];

  if (isAadhaarVerifyAccountSelection(scopes)) {
    assertAbhaInLoginAccounts(abhaNumber, session.context.loginAccounts);
    const profileToken = transferToken.trim();
    const pendingRefresh = session.context[LOGIN_PENDING_REFRESH_TOKEN_KEY];
    const tToken =
      typeof pendingRefresh === "string" && pendingRefresh.trim()
        ? pendingRefresh.trim()
        : undefined;
    await deps.sessions.patch({
      iqTenantId,
      sessionId: session.sessionId,
      state: "OTP_VERIFIED",
      txnId: session.txnId,
      xToken: profileToken,
      ...(tToken ? { tToken } : {}),
      contextMerge: {
        [LOGIN_NEEDS_USER_VERIFY_KEY]: false,
        [LOGIN_TRANSFER_TOKEN_KEY]: undefined,
        [LOGIN_PENDING_REFRESH_TOKEN_KEY]: undefined,
        loginSelectedAbhaNumber: abhaNumber,
        loginUserVerifiedAt: new Date().toISOString(),
      },
    });
    return {
      sessionId: session.sessionId,
      txnId: session.txnId,
      message: "User verified",
    };
  }

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

/** Aadhaar-channel verify already returns profile tokens; verify/user selects ABHA locally (no NHA call). */
function isAadhaarVerifyAccountSelection(scopes: unknown): boolean {
  if (!Array.isArray(scopes)) return false;
  const list = scopes.filter((s): s is string => typeof s === "string");
  return list.includes("aadhaar-verify") && !list.includes("mobile-verify");
}

function assertAbhaInLoginAccounts(abhaNumber: string, accounts: unknown): void {
  if (!Array.isArray(accounts)) {
    throw new AbdmUseCaseError("session missing login accounts from verify step", 409, "CONFLICT");
  }
  for (const row of accounts) {
    if (!row || typeof row !== "object") continue;
    const candidate = (row as { abhaNumber?: string }).abhaNumber;
    if (candidate && normalizeAbhaNumber(candidate) === abhaNumber) {
      return;
    }
  }
  throw new AbdmUseCaseError(
    "abhaNumber does not match any account from verify response",
    400,
    "BAD_REQUEST",
  );
}
