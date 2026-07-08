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
import type { AbdmFlowKind, AbdmSession } from "../domain/session.js";
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

export interface M1LoginOtpVerifyResult {
  sessionId: string;
  txnId: string;
  message: string;
  authResult?: string;
  accounts?: ReturnType<typeof mapNhaLoginAccounts>;
  needsUserSelection?: boolean;
  loginTransferToken?: string;
}

export async function m1LoginOtpVerify(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  input: { sessionId: string; otp: string },
  expectedFlowKind: M1OtpSessionFlowKind,
): Promise<M1LoginOtpVerifyResult> {
  const otp = normalizeOtp(input.otp);
  const session = await loadVerifiableSession(deps, iqTenantId, input.sessionId, expectedFlowKind);

  const cert = await deps.gateway.getPublicCertificate();
  const otpValue = encryptLoginIdWithAbdmPublicKey(cert.publicKey, otp);
  const loginApi = parseLoginApiVariant(session.context[LOGIN_API_VARIANT_KEY]);
  const body: NhaLoginVerifyBody = {
    scope: resolveVerifyScope(session.context[LOGIN_SCOPES_CONTEXT_KEY]),
    authData: {
      authMethods: ["otp"],
      otp: { txnId: session.txnId, otpValue },
    },
  };
  const nha = await deps.gateway.post<NhaLoginVerifyBody, NhaLoginVerifyResponse>({
    path: nhaLoginVerifyOtpPath(loginApi),
    body,
  });
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : session.txnId;

  // PHR ABHA-address login: verify returns profile tokens directly (no verify/user in Postman/milestone1).
  if (loginApi === "phr-abha") {
    return finalizePhrAbhaLogin(deps, iqTenantId, session.sessionId, nha, txnId);
  }

  const accounts = mapNhaLoginAccounts(nha.accounts);
  if (accounts.length > 0) {
    return finalizeMultiAccountLogin(deps, iqTenantId, session.sessionId, nha, txnId, accounts);
  }

  return finalizeSingleAccountLogin(deps, iqTenantId, session.sessionId, nha, txnId);
}

/** OTP must be exactly 6 digits after trimming. */
function normalizeOtp(raw: string): string {
  const otp = String(raw ?? "").trim();
  if (!/^\d{6}$/.test(otp)) {
    throw new AbdmUseCaseError("otp must be exactly 6 digits", 400);
  }
  return otp;
}

type VerifiableSession = AbdmSession<M1OtpSessionFlowKind> & { txnId: string };

/** Load the session and assert it is in a state that can accept an OTP verify. */
async function loadVerifiableSession(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  sessionId: string,
  expectedFlowKind: M1OtpSessionFlowKind,
): Promise<VerifiableSession> {
  const session = await deps.sessions.findById({ iqTenantId, sessionId });
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
  return session as VerifiableSession;
}

/** Stored scopes from the request step, falling back to the default login scope set. */
function resolveVerifyScope(storedScopes: unknown): string[] {
  return Array.isArray(storedScopes)
    ? storedScopes.filter((s): s is string => typeof s === "string")
    : ["abha-login", "aadhaar-verify"];
}

function readNhaMessage(nha: NhaLoginVerifyResponse): string {
  return typeof nha.message === "string" ? nha.message : "OTP verified";
}

function readNhaAuthResult(nha: NhaLoginVerifyResponse): string | undefined {
  return typeof nha.authResult === "string" ? nha.authResult : undefined;
}

/** PHR ABHA-address: verify returns profile tokens directly; no account/user selection. */
async function finalizePhrAbhaLogin(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  sessionId: string,
  nha: NhaLoginVerifyResponse,
  txnId: string,
): Promise<M1LoginOtpVerifyResult> {
  const { xToken, tToken } = extractLoginProfileTokens(nha);
  await deps.sessions.patch({
    iqTenantId,
    sessionId,
    state: "OTP_VERIFIED",
    txnId,
    xToken,
    ...(tToken ? { tToken } : {}),
    contextMerge: {
      [LOGIN_NEEDS_USER_VERIFY_KEY]: false,
      loginUsers: mapNhaPhrLoginUsers(nha.users),
      loginVerifiedAt: new Date().toISOString(),
      loginAuthResult: readNhaAuthResult(nha),
    },
  });
  return {
    sessionId,
    txnId,
    message: readNhaMessage(nha),
    authResult: readNhaAuthResult(nha),
    needsUserSelection: false,
  };
}

/** Profile login returning multiple accounts: stash transfer token, require user selection. */
async function finalizeMultiAccountLogin(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  sessionId: string,
  nha: NhaLoginVerifyResponse,
  txnId: string,
  accounts: ReturnType<typeof mapNhaLoginAccounts>,
): Promise<M1LoginOtpVerifyResult> {
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
    sessionId,
    state: "OTP_VERIFIED",
    txnId,
    contextMerge: {
      [LOGIN_TRANSFER_TOKEN_KEY]: transferToken,
      ...(pendingRefresh ? { [LOGIN_PENDING_REFRESH_TOKEN_KEY]: pendingRefresh } : {}),
      [LOGIN_NEEDS_USER_VERIFY_KEY]: true,
      loginAccounts: accounts,
      loginVerifiedAt: new Date().toISOString(),
      loginAuthResult: readNhaAuthResult(nha),
    },
  });
  return {
    sessionId,
    txnId,
    message: readNhaMessage(nha),
    authResult: readNhaAuthResult(nha),
    accounts,
    needsUserSelection: true,
    loginTransferToken: transferToken,
  };
}

/** Profile login resolving to a single account: profile tokens returned directly. */
async function finalizeSingleAccountLogin(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  sessionId: string,
  nha: NhaLoginVerifyResponse,
  txnId: string,
): Promise<M1LoginOtpVerifyResult> {
  const { xToken, tToken } = extractLoginProfileTokens(nha);
  await deps.sessions.patch({
    iqTenantId,
    sessionId,
    state: "OTP_VERIFIED",
    txnId,
    xToken,
    ...(tToken ? { tToken } : {}),
    contextMerge: {
      [LOGIN_NEEDS_USER_VERIFY_KEY]: false,
      loginVerifiedAt: new Date().toISOString(),
      loginAuthResult: readNhaAuthResult(nha),
    },
  });
  return {
    sessionId,
    txnId,
    message: readNhaMessage(nha),
    authResult: readNhaAuthResult(nha),
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
