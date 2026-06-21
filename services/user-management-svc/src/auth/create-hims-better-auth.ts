import { randomUUID } from "node:crypto";
import { betterAuth, type Auth } from "better-auth";
import { APIError } from "better-auth/api";
import { symmetricDecrypt } from "better-auth/crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin, bearer, jwt, username } from "better-auth/plugins";
import type { DbInstance } from "@hims/ts-sdk-db";
import {
  assertUserCanAuthenticate,
  loadIdentityJwtClaims,
  UserAccountDisabledError,
  type IdentityJwtClaimsDeps,
} from "@hims/user-management";
import { authJwks, authSchema } from "./auth-schema.js";

export type HimsBetterAuthEnv = {
  /** Backend/API origin (`AUTH_BASE_URL`). better-auth `baseURL` and JWT issuer — not the browser origin. */
  authBaseUrl: string;
  /** Browser origin (`WEB_PUBLIC_ORIGIN`) for CORS/trustedOrigins only — never JWT issuer/JWKS. */
  webPublicOrigin?: string;
  secret: string;
  jwtIssuer: string;
  jwtAudience: string;
  trustedOrigins: string[];
  disableJwtPrivateKeyEncryption: boolean;
};

function shouldAutoRepairJwks(env: HimsBetterAuthEnv): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const { hostname } = new URL(env.authBaseUrl);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Dev-only safety valve: if the stored JWKS private keys were encrypted with an
 * older BETTER_AUTH_SECRET, Better Auth cannot mint session JWTs and login
 * stalls forever. In local dev we can safely drop the stale signing keys so the
 * plugin regenerates them with the current secret on the next request.
 */
export async function repairJwksForDevelopment(
  db: DbInstance,
  env: HimsBetterAuthEnv,
): Promise<boolean> {
  if (!shouldAutoRepairJwks(env) || env.disableJwtPrivateKeyEncryption) {
    return false;
  }

  const jwksRows = await db
    .select({
      id: authJwks.id,
      privateKey: authJwks.privateKey,
    })
    .from(authJwks);

  for (const row of jwksRows) {
    try {
      const encryptedPrivateKey = JSON.parse(row.privateKey);
      if (typeof encryptedPrivateKey !== "string") {
        throw new Error("JWKS private key is not stored as an encrypted string");
      }
      await symmetricDecrypt({ key: env.secret, data: encryptedPrivateKey });
    } catch {
      await db.delete(authJwks);
      console.warn(
        "Detected undecryptable better-auth JWKS rows in local development; cleared auth.jwks so signing keys can be regenerated with the current secret.",
      );
      return true;
    }
  }

  return false;
}

/**
 * better-auth: sessions, bearer, refresh lifecycle, RS256 JWT + JWKS.
 * JWT carries HLD-04 identity claims only; authorization comes from PrincipalService + Cerbos (never from JWT beyond roles/org/dept).
 */
export function createHimsBetterAuth(
  db: DbInstance,
  env: HimsBetterAuthEnv,
  claimsDeps: IdentityJwtClaimsDeps,
) {
  return betterAuth({
    baseURL: env.authBaseUrl,
    basePath: "/api/auth",
    // Prevent unauthenticated username enumeration via the username plugin's public check.
    disabledPaths: ["/is-username-available"],
    secret: env.secret,
    trustedOrigins: env.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      // Kept enabled: the username plugin's sign-up route is /sign-up/email, and reset flows
      // live here. Login is username-primary (signIn.username); email is the synthetic anchor.
      enabled: true,
      // Off by default in better-auth — required by the authn spec (§14) so a password reset
      // invalidates existing sessions.
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      additionalFields: {
        iq_tenant_id: {
          type: "string",
          required: true,
          input: true,
          returned: true,
        },
        platform_user_id: {
          type: "string",
          required: true,
          input: true,
          returned: true,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const r = user as Record<string, unknown>;
            const pid = r.platform_user_id;
            if (typeof pid === "string" && pid.length > 0) {
              const next = { ...r, id: pid, platform_user_id: null };
              return {
                data: next as unknown as typeof user,
                forceAllowId: true,
              };
            }
            return { data: user };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const row = await claimsDeps.userRepository.findUserByGlobalId(session.userId);
            if (row !== null) {
              try {
                assertUserCanAuthenticate(row);
              } catch (err) {
                if (err instanceof UserAccountDisabledError) {
                  throw new APIError("FORBIDDEN", { message: err.message });
                }
                throw err;
              }
            }
            return { data: session };
          },
        },
      },
    },
    plugins: [
      bearer(),
      // Username-primary login (ADR-0003): globally unique, lowercased in place; displayUsername
      // preserves casing. The /is-username-available endpoint is disabled above (enumeration).
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30,
      }),
      // Admin endpoints (auth.api.createUser / setUserPassword / revokeUserSessions / ban) backing
      // platform provisioning + recovery Flow A. Authorization is enforced by the platform
      // (PrincipalService / Cerbos) before invoking these server-side; better-auth's own role check
      // is bypassed for trusted server-side calls (no request headers).
      admin(),
      jwt({
        jwks: {
          jwksPath: "/.well-known/jwks.json",
          keyPairConfig: { alg: "RS256", modulusLength: 2048 },
          disablePrivateKeyEncryption: env.disableJwtPrivateKeyEncryption,
          // Explicit key rotation (disabled by default in better-auth). Lazy/sign-driven; seconds.
          rotationInterval: 60 * 60 * 24 * 7, // 7 days
          gracePeriod: 60 * 60 * 24 * 14, // 14 days — old keys still verify during overlap
        },
        jwt: {
          issuer: env.jwtIssuer,
          audience: env.jwtAudience,
          // 5 min today. The authn spec's <=2 min target is coupled to the BFF Token Handler
          // (seamless refresh); dropping to 2 min before that ships would force re-login every 2 min.
          expirationTime: "5m",
          definePayload: async ({ user }) => {
            const authUser = user as Record<string, unknown>;
            let claims;
            try {
              claims = await loadIdentityJwtClaims(claimsDeps, user.id);
            } catch (err) {
              if (err instanceof UserAccountDisabledError) {
                throw new APIError("FORBIDDEN", { message: err.message });
              }
              throw err;
            }

            if (claims === null) {
              // Platform user row doesn't exist yet (fresh sign-up before admin provisioning).
              // Issue a minimal JWT so the session is usable; roles will appear once the
              // platform user is created and roles are assigned.
              return {
                sub: user.id,
                iq_tenant_id: authUser.iq_tenant_id ?? null,
                org_id: null,
                roles: [],
                jti: randomUUID(),
              } as never;
            }

            const org =
              claims.org_id === null || claims.org_id === undefined
                ? null
                : String(claims.org_id).trim();
            const payload: Record<string, unknown> = {
              sub: user.id,
              iq_tenant_id: claims.iq_tenant_id,
              org_id: org === "" ? null : org,
              roles: claims.roles,
              jti: randomUUID(),
            };
            const dept = claims.department;
            if (dept !== null && dept !== undefined && String(dept).trim() !== "") {
              payload.department = String(dept).trim();
            }
            return payload as never;
          },
        },
      }),
    ],
  }) as unknown as Auth;
}

export type HimsBetterAuthInstance = ReturnType<typeof createHimsBetterAuth>;
