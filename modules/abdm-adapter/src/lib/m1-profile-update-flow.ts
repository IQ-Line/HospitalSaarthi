import type {
  NhaProfileAccountRequestOtpBody,
  NhaProfileAccountRequestOtpResponse,
  NhaProfileAccountVerifyBody,
  NhaProfileAccountVerifyResponse,
  ProfileUpdateChannel,
} from "@hims/ts-sdk-abha/protocol/m1";
import type { AbdmAdapterDeps } from "../ports.js";
import { loadM1ProfileSession } from "./load-m1-profile-session.js";
import { nhaProfileXTokenHeaders } from "./nha-profile-headers.js";
import { encryptLoginIdWithAbdmPublicKey } from "./rsa-abdm-login-id.js";
import { AbdmUseCaseError } from "./m1-errors.js";

const PROFILE_UPDATE_SCOPES_KEY = "profileUpdateScopes";
const PROFILE_UPDATE_TXN_KEY = "profileUpdateTxnId";

function channelConfig(channel: ProfileUpdateChannel): {
  scope: string[];
  loginHint: string;
} {
  if (channel === "mobile") {
    return { scope: ["abha-profile", "mobile-verify"], loginHint: "mobile" };
  }
  return { scope: ["abha-profile", "email-verify"], loginHint: "email" };
}

export async function m1ProfileUpdateSendOtp(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  input: { sessionId: string; channel: ProfileUpdateChannel; plainValue: string },
): Promise<{ sessionId: string; txnId: string; message: string }> {
  const session = await loadM1ProfileSession(deps.sessions, iqTenantId, input.sessionId);
  const { scope, loginHint } = channelConfig(input.channel);
  const cert = await deps.gateway.getPublicCertificate();
  const loginId = encryptLoginIdWithAbdmPublicKey(cert.publicKey, input.plainValue);
  const body: NhaProfileAccountRequestOtpBody = {
    scope,
    loginHint,
    loginId,
    otpSystem: "abdm",
  };
  const nha = await deps.gateway.post<
    NhaProfileAccountRequestOtpBody,
    NhaProfileAccountRequestOtpResponse
  >({
    path: "/v3/profile/account/request/otp",
    body,
    headers: nhaProfileXTokenHeaders(session.xToken!),
  });
  const txnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : "";
  if (!txnId) {
    throw new Error("NHA profile/account/request/otp response missing txnId");
  }
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    contextMerge: {
      profileUpdateChannel: input.channel,
      [PROFILE_UPDATE_SCOPES_KEY]: scope,
      [PROFILE_UPDATE_TXN_KEY]: txnId,
      profileUpdateOtpMessage: nha.message,
    },
  });
  return {
    sessionId: session.sessionId,
    txnId,
    message: typeof nha.message === "string" ? nha.message : "OTP sent",
  };
}

export async function m1ProfileUpdateVerifyOtp(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  input: { sessionId: string; otp: string },
): Promise<{
  sessionId: string;
  txnId: string;
  message: string;
  authResult?: string;
}> {
  const otp = String(input.otp ?? "").trim();
  if (!/^\d{6}$/.test(otp)) {
    throw new AbdmUseCaseError("otp must be exactly 6 digits", 400);
  }
  const session = await loadM1ProfileSession(deps.sessions, iqTenantId, input.sessionId);
  const storedTxn = session.context[PROFILE_UPDATE_TXN_KEY];
  const txnId = typeof storedTxn === "string" && storedTxn ? storedTxn : session.txnId;
  if (!txnId) {
    throw new AbdmUseCaseError("profile update OTP not requested on this session", 400);
  }
  const storedScopes = session.context[PROFILE_UPDATE_SCOPES_KEY];
  const scope = Array.isArray(storedScopes)
    ? storedScopes.filter((s): s is string => typeof s === "string")
    : ["abha-profile", "mobile-verify"];
  const cert = await deps.gateway.getPublicCertificate();
  const otpValue = encryptLoginIdWithAbdmPublicKey(cert.publicKey, otp);
  const body: NhaProfileAccountVerifyBody = {
    scope,
    authData: {
      authMethods: ["otp"],
      otp: { txnId, otpValue },
    },
  };
  const nha = await deps.gateway.post<NhaProfileAccountVerifyBody, NhaProfileAccountVerifyResponse>(
    {
      path: "/v3/profile/account/verify",
      body,
      headers: nhaProfileXTokenHeaders(session.xToken!),
    },
  );
  const outTxnId = typeof nha.txnId === "string" && nha.txnId ? nha.txnId : txnId;
  await deps.sessions.patch({
    iqTenantId,
    sessionId: session.sessionId,
    contextMerge: { profileUpdateVerifyResponse: nha },
  });
  return {
    sessionId: session.sessionId,
    txnId: outTxnId,
    message: typeof nha.message === "string" ? nha.message : "Profile updated",
    authResult: typeof nha.authResult === "string" ? nha.authResult : undefined,
  };
}
