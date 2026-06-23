import type {
  LoginVerifyUserHimsResponse,
  NhaLoginVerifyUserBody,
  NhaLoginVerifyUserResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import { extractLoginProfileTokens } from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../ports.js";
import type { AbdmSession } from "../domain/session.js";
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
  assertSessionReadyForVerifyUser(session, expectedFlowKind);
  const transferToken = requireTransferToken(session);

  const abhaNumber = normalizeAbhaNumber(input.abhaNumber);
  const scopes = session.context[LOGIN_SCOPES_CONTEXT_KEY];

  if (isAadhaarVerifyAccountSelection(scopes)) {
    return completeAadhaarVerifyUserLocally(deps, iqTenantId, session, {
      txnId: session.txnId,
      transferToken,
      abhaNumber,
    });
  }

  return completeVerifyUserViaNha(deps, iqTenantId, session, {
    txnId: session.txnId,
    transferToken,
    abhaNumber,
  });
}

/** A session that has passed {@link assertSessionReadyForVerifyUser}: txnId present, transfer token non-empty. */
type VerifyUserReadySession = AbdmSession & { txnId: string };

/**
 * Validates that a freshly-loaded session is in the exact state verify/user requires
 * (loaded, matching flow, OTP_VERIFIED, profile/mobile variant, still pending user-verify,
 * has a txnId). Throws AbdmUseCaseError on any violation; narrows the session's txnId.
 * The transfer-token check stays in {@link requireTransferToken}, called next, to preserve
 * the original guard ordering.
 */
function assertSessionReadyForVerifyUser(
  session: AbdmSession | null,
  expectedFlowKind: M1OtpSessionFlowKind,
): asserts session is VerifyUserReadySession {
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
  if (parseLoginApiVariant(session.context[LOGIN_API_VARIANT_KEY]) === "phr-abha") {
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
}

/**
 * Reads the session's transfer token, asserting it is a non-empty string. This is the
 * "session has a pending account selection" guard; it runs immediately after
 * {@link assertSessionReadyForVerifyUser} to preserve the original guard ordering.
 */
function requireTransferToken(session: VerifyUserReadySession): string {
  const transferToken = session.context[LOGIN_TRANSFER_TOKEN_KEY];
  if (typeof transferToken !== "string" || !transferToken.trim()) {
    throw new AbdmUseCaseError(
      "session has no pending account selection; call verify OTP first and ensure the response has needsUserSelection true and accounts[]",
      409,
      "CONFLICT",
    );
  }
  return transferToken;
}

/**
 * Aadhaar-channel verify already returned profile tokens; verify/user just selects the ABHA
 * locally — no NHA call. Patches the session with the existing transfer token as the x_token
 * and the pending refresh token (if any) as the t_token.
 */
async function completeAadhaarVerifyUserLocally(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  session: VerifyUserReadySession,
  args: { txnId: string; transferToken: string; abhaNumber: string },
): Promise<LoginVerifyUserHimsResponse> {
  assertAbhaInLoginAccounts(args.abhaNumber, session.context.loginAccounts);
  const profileToken = args.transferToken.trim();
  const tToken = readNonEmptyString(session.context[LOGIN_PENDING_REFRESH_TOKEN_KEY]);
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_VERIFIED",
    txnId: args.txnId,
    xToken: profileToken,
    ...(tToken ? { tToken } : {}),
    contextMerge: {
      [LOGIN_NEEDS_USER_VERIFY_KEY]: false,
      [LOGIN_TRANSFER_TOKEN_KEY]: undefined,
      [LOGIN_PENDING_REFRESH_TOKEN_KEY]: undefined,
      loginSelectedAbhaNumber: args.abhaNumber,
      loginUserVerifiedAt: new Date().toISOString(),
    },
  });
  return {
    sessionId: session.sessionId,
    txnId: args.txnId,
    message: "User verified",
  };
}

/**
 * Mobile-channel verify/user: calls NHA with the T-token, consumes the returned verify token
 * as the session's x_token/t_token, and retains the original txnId (verify/user does not change
 * the txn — NHA's verify token is consumed as xToken/tToken above, not as a txnId).
 */
async function completeVerifyUserViaNha(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  session: VerifyUserReadySession,
  args: { txnId: string; transferToken: string; abhaNumber: string },
): Promise<LoginVerifyUserHimsResponse> {
  const body: NhaLoginVerifyUserBody = {
    ABHANumber: args.abhaNumber,
    txnId: args.txnId,
  };
  const nha = await deps.gateway.post<NhaLoginVerifyUserBody, NhaLoginVerifyUserResponse>({
    path: "/v3/profile/login/verify/user",
    body,
    headers: nhaLoginTTokenHeaders(args.transferToken),
  });
  const { xToken, tToken } = extractLoginProfileTokens(nha);

  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_VERIFIED",
    txnId: args.txnId,
    xToken,
    ...(tToken ? { tToken } : {}),
    contextMerge: {
      [LOGIN_NEEDS_USER_VERIFY_KEY]: false,
      [LOGIN_TRANSFER_TOKEN_KEY]: undefined,
      loginSelectedAbhaNumber: args.abhaNumber,
      loginUserVerifiedAt: new Date().toISOString(),
    },
  });

  return {
    sessionId: session.sessionId,
    txnId: args.txnId,
    message: typeof nha.message === "string" ? nha.message : "User verified",
  };
}

/** Trimmed string if non-empty, else undefined. */
function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
