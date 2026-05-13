import { randomUUID } from "node:crypto";
import { betterAuth, type Auth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { bearer, jwt } from "better-auth/plugins";
import type { DbInstance } from "@hims/ts-sdk-db";
import {
  loadIdentityJwtClaims,
  type IdentityJwtClaimsDeps,
} from "@hims/user-management";
import { authSchema } from "./auth-schema.js";

export type HimsBetterAuthEnv = {
  /** Public base URL of this service (e.g. `http://127.0.0.1:3000`). Used as better-auth `baseURL`. */
  authBaseUrl: string;
  secret: string;
  jwtIssuer: string;
  jwtAudience: string;
  trustedOrigins: string[];
  disableJwtPrivateKeyEncryption: boolean;
};

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
    secret: env.secret,
    trustedOrigins: env.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
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
    },
    plugins: [
      bearer(),
      jwt({
        jwks: {
          jwksPath: "/.well-known/jwks.json",
          keyPairConfig: { alg: "RS256", modulusLength: 2048 },
          disablePrivateKeyEncryption: env.disableJwtPrivateKeyEncryption,
        },
        jwt: {
          issuer: env.jwtIssuer,
          audience: env.jwtAudience,
          expirationTime: "5m",
          definePayload: async ({ user }) => {
            const authUser = user as Record<string, unknown>;
            const claims = await loadIdentityJwtClaims(claimsDeps, user.id);

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
