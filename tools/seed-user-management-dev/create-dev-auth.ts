/**
 * Local better-auth factory for the dev seed CLI only (relative imports — no @hims/* package resolution).
 */
import { randomUUID } from "node:crypto";
import { betterAuth, type Auth } from "better-auth";
import { symmetricDecrypt } from "better-auth/crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { bearer, jwt } from "better-auth/plugins";
import type { DbInstance } from "../../packages/ts-sdk-db/src/index.ts";
import {
  loadIdentityJwtClaims,
  type IdentityJwtClaimsDeps,
} from "../../modules/user-management/src/authn/identity-jwt-claims.ts";
import { authJwks, authSchema } from "../../services/user-management-svc/src/auth/auth-schema.ts";

export type DevSeedAuthEnv = {
  authBaseUrl: string;
  secret: string;
  jwtIssuer: string;
  jwtAudience: string;
};

export async function repairJwksForDevSeed(db: DbInstance, secret: string): Promise<void> {
  const jwksRows = await db
    .select({ id: authJwks.id, privateKey: authJwks.privateKey })
    .from(authJwks);

  for (const row of jwksRows) {
    try {
      const encryptedPrivateKey = JSON.parse(row.privateKey);
      if (typeof encryptedPrivateKey !== "string") {
        continue;
      }
      await symmetricDecrypt({ key: secret, data: encryptedPrivateKey });
    } catch {
      await db.delete(authJwks);
    }
  }
}

export function createDevSeedAuth(
  db: DbInstance,
  env: DevSeedAuthEnv,
  claimsDeps: IdentityJwtClaimsDeps,
) {
  return betterAuth({
    baseURL: env.authBaseUrl,
    basePath: "/api/auth",
    secret: env.secret,
    trustedOrigins: [],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        iq_tenant_id: { type: "string", required: true, input: true, returned: true },
        platform_user_id: { type: "string", required: true, input: true, returned: true },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const r = user as Record<string, unknown>;
            const pid = r.platform_user_id;
            if (typeof pid === "string" && pid.length > 0) {
              return {
                data: { ...r, id: pid, platform_user_id: null } as unknown as typeof user,
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
          disablePrivateKeyEncryption: true,
        },
        jwt: {
          issuer: env.jwtIssuer,
          audience: env.jwtAudience,
          expirationTime: "5m",
          definePayload: async ({ user }) => {
            const authUser = user as Record<string, unknown>;
            const claims = await loadIdentityJwtClaims(claimsDeps, user.id);
            if (claims === null) {
              return {
                sub: user.id,
                iq_tenant_id: authUser.iq_tenant_id ?? null,
                org_id: null,
                roles: [],
                jti: randomUUID(),
              } as never;
            }
            return {
              sub: user.id,
              iq_tenant_id: claims.iq_tenant_id,
              org_id: claims.org_id,
              roles: claims.roles,
              jti: randomUUID(),
            } as never;
          },
        },
      }),
    ],
  }) as unknown as Auth;
}
