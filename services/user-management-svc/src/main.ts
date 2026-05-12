import sensible from "@fastify/sensible";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import { createDb } from "@hims/ts-sdk-db";
import { createEventBus } from "@hims/ts-sdk-events";
import { identityPlugin, validateAuthConfig } from "@hims/ts-sdk-identity";
import Fastify, { type FastifyInstance } from "fastify";
import { createUserManagementAuthzTargetResolver } from "./authz-target-resolver.js";
import { createHimsBetterAuth } from "./auth/create-hims-better-auth.js";
import { registerBetterAuth } from "./auth/register-better-auth.js";
import {
  DrizzleAbacAttributeRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzleRoleAssignmentRepository,
  DrizzleRoleRepository,
  DrizzleUserRepository,
  createDefaultPrincipalService,
  principalRoleEnricherPlugin,
} from "@hims/user-management";
import { registerUserManagementApi } from "./openapi/register-user-management-api.js";

function readAuthBaseUrl(): string {
  const raw = process.env.AUTH_BASE_URL?.trim();
  if (!raw || raw.length === 0) {
    throw new Error(
      "AUTH_BASE_URL is required (better-auth baseURL; must align with JWT_ISSUER / identity issuer)",
    );
  }
  return raw.replace(/\/+$/, "");
}

function readBetterAuthSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new Error("BETTER_AUTH_SECRET is required (min 32 chars)");
  }
  return s;
}

function readTrustedOrigins(): string[] {
  const raw = process.env.AUTH_TRUSTED_ORIGINS?.trim();
  if (!raw || raw.length === 0) {
    return [];
  }
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error(
      "DATABASE_URL is required (PostgreSQL for user-management and better-auth persistence)",
    );
  }
  return databaseUrl;
}

/**
 * Fastify wiring: event bus, better-auth, identity verification, Cerbos, user-management module.
 */
async function createApp(): Promise<FastifyInstance> {
  const app = Fastify();

  const eventBus = createEventBus({ type: "in-process" });
  await eventBus.connect();

  app.addHook("onClose", async () => {
    await eventBus.disconnect();
  });

  await app.register(sensible);

  if (!process.env.CERBOS_URL || process.env.CERBOS_URL.trim() === "") {
    throw new Error("CERBOS_URL is required for authorization service");
  }
  const cerbosUrl = process.env.CERBOS_URL.trim();

  const identityAuth = validateAuthConfig();
  const pgDb = createDb(requireDatabaseUrl());

  const userRepository = new DrizzleUserRepository(pgDb);
  const roleRepository = new DrizzleRoleRepository(pgDb);
  const roleAssignmentRepository = new DrizzleRoleAssignmentRepository(pgDb);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(pgDb);
  const abacAttributeRepository = new DrizzleAbacAttributeRepository(pgDb);

  const principalService = createDefaultPrincipalService({
    userRepository,
    principalRoleProjectionRepository,
    abacAttributeRepository,
  });

  const trustedOrigins = readTrustedOrigins();
  const auth = createHimsBetterAuth(
    pgDb,
    {
      authBaseUrl: readAuthBaseUrl(),
      secret: readBetterAuthSecret(),
      jwtIssuer: identityAuth.issuer,
      jwtAudience: identityAuth.audience,
      trustedOrigins,
      disableJwtPrivateKeyEncryption:
        process.env.NODE_ENV === "test" ||
        process.env.BETTER_AUTH_DISABLE_JWT_KEY_ENCRYPTION === "true",
    },
    { userRepository, principalRoleProjectionRepository },
  );

  await registerBetterAuth(app, auth, { trustedOrigins });

  await app.register(identityPlugin, {
    ...identityAuth,
    skipPathPrefixes: ["/api/auth"],
  });

  await assertCerbosReachable(cerbosUrl);

  await app.register(principalRoleEnricherPlugin, {
    principalService,
  });
  await app.register(authzPlugin, {
    cerbosUrl,
    resolveTarget: createUserManagementAuthzTargetResolver({
      getUserProfile: async (tenantId, userId) => {
        const u = await userRepository.getUserById(tenantId, userId);
        if (u === null) return null;
        return {
          org_id: u.org_id ?? null,
          department: u.department ?? null,
          clearance_tier_required: u.clearance_tier_required ?? 0,
        };
      },
    }),
  });

  await registerUserManagementApi(app, {
    eventBus,
    userRepository,
    roleRepository,
    roleAssignmentRepository,
    principalRoleProjectionRepository,
  });

  return app;
}

async function main(): Promise<void> {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`User Management service listening on http://localhost:${port}`);
}

await main();
