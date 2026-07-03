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

type SigningMaterial = {
  key: KeyLike;
  /** Matches `kid` published in `/api/auth/.well-known/jwks.json` (auth.jwks.id). */
  kid: string;
};

async function loadSigningMaterial(
  db: DbInstance,
  env: HimsBetterAuthEnv,
): Promise<SigningMaterial> {
  const [row] = await db
    .select({ id: authJwks.id, privateKey: authJwks.privateKey })
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
    return {
      key: (await importJWK(JSON.parse(raw), "RS256")) as KeyLike,
      kid: row.id,
    };
  } catch {
    return {
      key: await importPKCS8(raw, "RS256"),
      kid: row.id,
    };
  }
}

export function createAccessTokenIssuer(
  db: DbInstance,
  env: HimsBetterAuthEnv,
  claimsDeps: IdentityJwtClaimsDeps,
): AccessTokenIssuerPort {
  return {
    async issueForPlatformUser(platformUserId: string) {
      const user = await claimsDeps.userRepository.findUserByGlobalId(platformUserId);
      if (user === null) {
        throw new Error(`Cannot issue token: platform user ${platformUserId} not found`);
      }

      const claims = await loadIdentityJwtClaims(claimsDeps, platformUserId);
      if (claims === null) {
        throw new Error(`Cannot issue token: identity claims missing for ${platformUserId}`);
      }

      const { key: signingKey, kid } = await loadSigningMaterial(db, env);
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
        .setProtectedHeader({ alg: "RS256", kid })
        .setSubject(platformUserId)
        .setIssuer(env.jwtIssuer)
        .setAudience(env.jwtAudience)
        .setIssuedAt()
        .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
        .sign(signingKey);

      const authUserId = user.auth_user_id ?? user.id;
      const refresh = await createIntegrationRefreshSession(db, authUserId);

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
