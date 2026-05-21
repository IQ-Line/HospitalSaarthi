import { createRemoteJWKSet, jwtVerify } from "jose";
import { abdmWarn } from "./abdm-adapter-log.js";
import { allowInsecureAbdmCallbacks } from "./abdm-runtime-env.js";

const DEFAULT_GATEWAY_JWKS_URL =
  "https://dev.abdm.gov.in/api/hiecm/gateway/v3/certs";

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function gatewayJwksUrl(): string {
  return (
    process.env["ABDM_GATEWAY_JWKS_URL"]?.trim() ||
    process.env["ABDM_GATEWAY_OPENID_JWKS_URI"]?.trim() ||
    DEFAULT_GATEWAY_JWKS_URL
  );
}

function getGatewayJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(gatewayJwksUrl()));
  }
  return cachedJwks;
}

/** Clears JWKS cache (tests). */
export function clearAbdmGatewayJwksCache(): void {
  cachedJwks = null;
}

/**
 * Verifies inbound gateway callback Authorization Bearer JWS.
 * Sandbox: `ABDM_ALLOW_INSECURE_CALLBACKS=true`. Production: verifies against NHA gateway JWKS.
 */
export async function verifyAbdmSignature(
  headers: Record<string, unknown>,
  _body: unknown,
): Promise<boolean> {
  if (allowInsecureAbdmCallbacks()) {
    return true;
  }

  const auth = String(
    headers.authorization ?? headers.Authorization ?? "",
  ).trim();
  if (!auth.toLowerCase().startsWith("bearer ")) {
    abdmWarn("abdm.callback.jws_missing_bearer", {});
    return false;
  }

  const token = auth.slice(7).trim();
  if (!token) {
    return false;
  }

  const issuer = process.env["ABDM_GATEWAY_JWT_ISSUER"]?.trim();
  const audience = process.env["ABDM_GATEWAY_JWT_AUDIENCE"]?.trim();

  try {
    await jwtVerify(token, getGatewayJwks(), {
      algorithms: ["RS256"],
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    });
    return true;
  } catch (e) {
    abdmWarn("abdm.callback.jws_verify_failed", {
      message: e instanceof Error ? e.message : String(e),
      jwksUrl: gatewayJwksUrl(),
    });
    return false;
  }
}
