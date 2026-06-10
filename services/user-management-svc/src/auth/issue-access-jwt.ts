import { randomUUID } from "node:crypto";
import { symmetricDecrypt } from "better-auth/crypto";
import { desc } from "drizzle-orm";
import { importJWK, importPKCS8, SignJWT, type KeyLike } from "jose";
import type { DbInstance } from "@hims/ts-sdk-db";
import {
  loadIdentityJwtClaims,
  type AccessTokenIssuerPort,
  type IdentityJwtClaimsDeps,
} from "@hims/user-management";
import { authJwks } from "./auth-schema.js";
import { createIntegrationRefreshSession } from "./create-integration-refresh-session.js";
import type { HimsBetterAuthEnv } from "./create-hims-better-auth.js";

const JWT_EXPIRY_SECONDS = 300;

async function loadSigningKey(
  db: DbInstance,
  env: HimsBetterAuthEnv,
): Promise<KeyLike> {
  const [row] = await db
    .select({ privateKey: authJwks.privateKey })
    .from(authJwks)
    .orderBy(desc(authJwks.createdAt))
    .limit(1);
  if (!row) {
    throw new Error("No JWKS signing key configured in auth.jwks");
  }

  let raw = row.privateKey;
  if (!env.disableJwtPrivateKeyEncryption) {
    const encrypted = JSON.parse(raw) as string;
    raw = await symmetricDecrypt({ key: env.secret, data: encrypted });
  }

  try {
    return (await importJWK(JSON.parse(raw), "RS256")) as KeyLike;
  } catch {
    return importPKCS8(raw, "RS256");
  }
}

export function createAccessTokenIssuer(
  db: DbInstance,
  env: HimsBetterAuthEnv,
  claimsDeps: IdentityJwtClaimsDeps,
): AccessTokenIssuerPort {
  return {
    async issueForPlatformUser(platformUserId: string) {
      const claims = await loadIdentityJwtClaims(claimsDeps, platformUserId);
      if (claims === null) {
        throw new Error(`Cannot issue token: platform user ${platformUserId} not found`);
      }

      const signingKey = await loadSigningKey(db, env);
      const payload: Record<string, unknown> = {
        iq_tenant_id: claims.iq_tenant_id,
        org_id: claims.org_id,
        roles: claims.roles,
        jti: randomUUID(),
      };
      if (claims.department) {
        payload.department = claims.department;
      }

      const access_token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "RS256" })
        .setSubject(platformUserId)
        .setIssuer(env.jwtIssuer)
        .setAudience(env.jwtAudience)
        .setIssuedAt()
        .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
        .sign(signingKey);

      const refresh = await createIntegrationRefreshSession(db, platformUserId);

      return {
        access_token,
        token_type: "Bearer" as const,
        expires_in: JWT_EXPIRY_SECONDS,
        refresh_token: refresh.refresh_token,
        refresh_expires_in: refresh.refresh_expires_in,
      };
    },
  };
}
