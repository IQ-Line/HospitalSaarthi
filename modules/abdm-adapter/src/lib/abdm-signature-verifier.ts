import { abdmWarn } from "./abdm-adapter-log.js";
import { allowInsecureAbdmCallbacks } from "./abdm-runtime-env.js";

/**
 * Verifies inbound gateway JWS.
 * Development / `ABDM_ALLOW_INSECURE_CALLBACKS=true`: permissive until JWKS verify ships.
 * Staging/production without opt-out: rejects (fail closed).
 * TODO: fetch JWKS from gateway OpenID config and verify Authorization header.
 */
export async function verifyAbdmSignature(
  _headers: Record<string, unknown>,
  _body: unknown,
): Promise<boolean> {
  if (allowInsecureAbdmCallbacks()) {
    return true;
  }
  abdmWarn("abdm.callback.jws_not_verified", {
    reason: "JWS verification not implemented; set ABDM_ALLOW_INSECURE_CALLBACKS only for sandbox",
  });
  return false;
}
