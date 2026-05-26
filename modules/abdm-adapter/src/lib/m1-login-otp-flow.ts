import {
  extractLoginProfileTokens,
  mapNhaLoginAccounts,
  mapNhaPhrLoginUsers,
  type NhaLoginRequestOtpBody,
  type NhaLoginRequestOtpResponse,
  type NhaLoginVerifyBody,
  type NhaLoginVerifyResponse,
} from "@hims/ts-sdk-abha/protocol/m1";
import {
  LOGIN_API_VARIANT_KEY,
  LOGIN_NEEDS_USER_VERIFY_KEY,
  LOGIN_PENDING_REFRESH_TOKEN_KEY,
  LOGIN_SCOPES_CONTEXT_KEY,
  LOGIN_TRANSFER_TOKEN_KEY,
  type M1NhaLoginApiVariant,
} from "./m1-login-session-context.js";
import {
  nhaLoginRequestOtpPath,
  nhaLoginVerifyOtpPath,
  parseLoginApiVariant,
} from "./m1-nha-login-paths.js";
import type { AbdmFlowKind } from "../domain/session.js";
import type { AbdmAdapterDeps } from "../ports.js";
import { encryptLoginIdWithAbdmPublicKey } from "./rsa-abdm-login-id.js";
import { AbdmUseCaseError } from "./m1-errors.js";
import { assertM1OtpRateLimit } from "./m1-otp-rate-limit.js";

export type M1OtpSessionFlowKind = "abdm.m1.login.v1" | "abdm.m1.verify-existing.v1";

export interface M1LoginOtpSendParams {
  flowKind: M1OtpSessionFlowKind;
  scope: string[];
  loginHint: string;
  otpSystem: string;
  plainLoginId: string;
  /** ABHA address login uses PHR web paths; ABHA number/mobile/aadhaar use profile login. */
  nhaLoginApi?: M1NhaLoginApiVariant;
  initialContext?: Record<string, unknown>;
}

export interface M1LoginOtpSendResult {
  sessionId: string;
  txnId: string;
  message: string;
}

export async function m1LoginOtpSend(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  params: M1LoginOtpSendParams,
): Promise<M1LoginOtpSendResult> {
  const action =
    params.flowKind === "abdm.m1.verify-existing.v1" ? "verify-otp" : "login-otp";
  assertM1OtpRateLimit(iqTenantId, action);
  const cert = await deps.gateway.getPublicCertificate();
  const loginId = encryptLoginIdWithAbdmPublicKey(cert.publicKey, params.plainLoginId);
  const body: NhaLoginRequestOtpBody = {
    scope: params.scope,
    loginHint: params.loginHint,
    loginId,
    otpSystem: params.otpSystem,
  };
  const loginApi = params.nhaLoginApi ?? "profile";
  const nha = await deps.gateway.post<NhaLoginRequestOtpBody, NhaLoginRequestOtpResponse>({
    path: nhaLoginRequestOtpPath(loginApi),
    body,
  });
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : "";
  if (!txnId) {
    throw new Error("NHA login/request/otp response missing txnId");
  }
  const session = await deps.sessions.create({
    iqTenantId,
    flowKind: params.flowKind,
    initialContext: params.initialContext ?? {},
  });
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_REQUESTED",
    txnId,
    contextMerge: {
      [LOGIN_SCOPES_CONTEXT_KEY]: params.scope,
      [LOGIN_API_VARIANT_KEY]: loginApi,
      loginOtpMessage: nha.message,
    },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "OTP sent",
  };
}

export async function m1LoginOtpVerify(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  input: { sessionId: string; otp: string },
  expectedFlowKind: M1OtpSessionFlowKind,
): Promise<{
  sessionId: string;
  txnId: string;
  message: string;
  authResult?: string;
  accounts?: ReturnType<typeof mapNhaLoginAccounts>;
  needsUserSelection?: boolean;
  loginTransferToken?: string;
}> {
  const otp = String(input.otp ?? "").trim();
  if (!/^\d{6}$/.test(otp)) {
    throw new AbdmUseCaseError("otp must be exactly 6 digits", 400);
  }
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
  if (session.state !== "OTP_REQUESTED") {
    throw new AbdmUseCaseError(
      `session state must be OTP_REQUESTED, got ${session.state}`,
      409,
      "CONFLICT",
    );
  }
  if (!session.txnId) {
    throw new AbdmUseCaseError("session missing txnId", 400);
  }
  const storedScopes = session.context[LOGIN_SCOPES_CONTEXT_KEY];
  const scope = Array.isArray(storedScopes)
    ? storedScopes.filter((s): s is string => typeof s === "string")
    : ["abha-login", "aadhaar-verify"];
  const cert = await deps.gateway.getPublicCertificate();
  const otpValue = encryptLoginIdWithAbdmPublicKey(cert.publicKey, otp);
  const body: NhaLoginVerifyBody = {
    scope,
    authData: {
      authMethods: ["otp"],
      otp: { txnId: session.txnId, otpValue },
    },
  };
  const nha = await deps.gateway.post<NhaLoginVerifyBody, NhaLoginVerifyResponse>({
    path: nhaLoginVerifyOtpPath(parseLoginApiVariant(session.context[LOGIN_API_VARIANT_KEY])),
    body,
  });
  const loginApi = parseLoginApiVariant(session.context[LOGIN_API_VARIANT_KEY]);
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : session.txnId;

  // PHR ABHA-address login: verify returns profile tokens directly (no verify/user in Postman/milestone1).
  if (loginApi === "phr-abha") {
    const { xToken, tToken } = extractLoginProfileTokens(nha);
    await deps.sessions.patch({
      iqTenantId,
      sessionId: session.sessionId,
      state: "OTP_VERIFIED",
      txnId,
      xToken,
      ...(tToken ? { tToken } : {}),
      contextMerge: {
        [LOGIN_NEEDS_USER_VERIFY_KEY]: false,
        loginUsers: mapNhaPhrLoginUsers(nha.users),
        loginVerifiedAt: new Date().toISOString(),
        loginAuthResult: typeof nha.authResult === "string" ? nha.authResult : undefined,
      },
    });
    return {
      sessionId: session.sessionId,
      txnId,
      message: typeof nha.message === "string" ? nha.message : "OTP verified",
      authResult: typeof nha.authResult === "string" ? nha.authResult : undefined,
      needsUserSelection: false,
    };
  }

  const accounts = mapNhaLoginAccounts(nha.accounts);
  const needsUserSelection = accounts.length > 0;

  if (needsUserSelection) {
    const transferToken = resolveLoginTransferToken(nha);
    if (!transferToken) {
      throw new Error(
        "NHA login/verify response missing token/refreshToken for account selection (check multi-account verify response)",
      );
    }
    const pendingRefresh =
      typeof nha.refreshToken === "string" && nha.refreshToken.trim()
        ? nha.refreshToken.trim()
        : undefined;
    await deps.sessions.patch({
      iqTenantId,
      sessionId: session.sessionId,
      state: "OTP_VERIFIED",
      txnId,
      contextMerge: {
        [LOGIN_TRANSFER_TOKEN_KEY]: transferToken,
        ...(pendingRefresh ? { [LOGIN_PENDING_REFRESH_TOKEN_KEY]: pendingRefresh } : {}),
        [LOGIN_NEEDS_USER_VERIFY_KEY]: true,
        loginAccounts: accounts,
        loginVerifiedAt: new Date().toISOString(),
        loginAuthResult: typeof nha.authResult === "string" ? nha.authResult : undefined,
      },
    });
    return {
      sessionId: session.sessionId,
      txnId,
      message: typeof nha.message === "string" ? nha.message : "OTP verified",
      authResult: typeof nha.authResult === "string" ? nha.authResult : undefined,
      accounts,
      needsUserSelection: true,
      loginTransferToken: transferToken,
    };
  }

  const { xToken, tToken } = extractLoginProfileTokens(nha);
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    state: "OTP_VERIFIED",
    txnId,
    xToken,
    ...(tToken ? { tToken } : {}),
    contextMerge: {
      [LOGIN_NEEDS_USER_VERIFY_KEY]: false,
      loginVerifiedAt: new Date().toISOString(),
      loginAuthResult: typeof nha.authResult === "string" ? nha.authResult : undefined,
    },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "OTP verified",
    authResult: typeof nha.authResult === "string" ? nha.authResult : undefined,
    needsUserSelection: false,
  };
}

export function assertFlowKind(
  flowKind: AbdmFlowKind,
  expected: M1OtpSessionFlowKind,
): void {
  if (flowKind !== expected) {
    throw new AbdmUseCaseError("invalid session flow", 400);
  }
}

/** NHA may return `token` or `refreshToken` for multi-account selection (Postman sets both). */
function resolveLoginTransferToken(nha: NhaLoginVerifyResponse): string {
  if (typeof nha.token === "string" && nha.token.trim()) {
    return nha.token.trim();
  }
  if (typeof nha.refreshToken === "string" && nha.refreshToken.trim()) {
    return nha.refreshToken.trim();
  }
  return "";
}
