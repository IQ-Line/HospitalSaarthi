import { jwtVerify } from "jose";
import type { JWTVerifyOptions } from "jose";
import { getJwksKeyFn } from "./jwks.js";
import type { HimsJwtPayload, IdentityPluginOptions, Principal } from "./types.js";

function toPrincipal(payload: HimsJwtPayload): Principal {
  return {
    userId: payload.sub,
    tenantId: payload.iq_tenant_id,
    orgId: payload.org_id,
    roles: payload.roles,
    sessionId: payload.session_id,
    iat: payload.iat,
    exp: payload.exp,
    iss: payload.iss,
  };
}

export async function verifyToken(
  token: string,
  options: IdentityPluginOptions,
): Promise<Principal> {
  const keyFn = getJwksKeyFn(options.jwksUrl, options.cacheTtlMs);

  const verifyOpts: JWTVerifyOptions = {};
  if (options.issuer) verifyOpts.issuer = options.issuer;
  if (options.audience) verifyOpts.audience = options.audience;
  verifyOpts.requiredClaims = ["sub", "iq_tenant_id", "org_id", "roles", "session_id"];

  const { payload } = await jwtVerify<HimsJwtPayload>(token, keyFn, verifyOpts);

  return toPrincipal(payload);
}
