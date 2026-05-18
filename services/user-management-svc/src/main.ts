import sensible from "@fastify/sensible";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import { createDb } from "@hims/ts-sdk-db";
import { createEventBus } from "@hims/ts-sdk-events";
import { identityPlugin, validateAuthConfig } from "@hims/ts-sdk-identity";
import Fastify, { type FastifyInstance } from "fastify";
import { createUserManagementAuthzTargetResolver } from "./authz-target-resolver.js";
import {
  createHimsBetterAuth,
  repairJwksForDevelopment,
} from "./auth/create-hims-better-auth.js";
import { createPasswordAuthAccountProvisioner } from "./auth/create-password-auth-account-provisioner.js";
import { registerBetterAuth } from "./auth/register-better-auth.js";
import {
  runDevelopmentBootstrap,
  shouldRunDevelopmentBootstrap,
} from "./bootstrap/development-bootstrap.js";
import {
  DrizzleCapabilityRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  DrizzleRoleCapabilityRepository,
  DrizzleRoleRepository,
  DrizzleUserAccessRepository,
  DrizzleUserProvisioningRepository,
  DrizzleUserRepository,
  createDefaultPrincipalService,
  formatRuntimeAuthorizationStartupFailure,
  validateRuntimeAuthorizationStartup,
  principalRoleEnricherPlugin,
} from "../../../modules/user-management/src/index.js";
import { HttpConfiguratorTenantModuleEntitlementAdapter } from "./adapters/http-configurator-tenant-module-entitlement-adapter.js";
import { HttpMasterDataModuleCatalogAdapter } from "./adapters/http-master-data-module-catalog-adapter.js";
import { registerUserManagementApi } from "./openapi/register-user-management-api.js";

function requireUpstreamBaseUrl(envKey: string): string {
  const raw = process.env[envKey]?.trim();
  if (!raw || raw.length === 0) {
    throw new Error(
      `${envKey} is required for tenant module entitlements and Master Data module catalog integration`,
    );
  }
  return raw.replace(/\/+$/, "");
}

function normalizeIdentityJwksUrl(authBaseUrl: string): string {
  const expected = `${authBaseUrl}/api/auth/.well-known/jwks.json`;
  const configured = process.env.JWKS_URL?.trim();
  if (!configured || configured.length === 0) {
    process.env.JWKS_URL = expected;
    return expected;
  }

  try {
    const parsed = new URL(configured);
    if (parsed.origin === authBaseUrl && parsed.pathname === "/.well-known/jwks.json") {
      process.env.JWKS_URL = expected;
      return expected;
    }
  } catch {
    // Keep validation failure behavior below if the configured URL is not parseable.
  }

  return configured;
}

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
  const databaseUrl = (process.env.USER_MGMT_DATABASE_URL ?? process.env.DATABASE_URL)?.trim();
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error(
      "USER_MGMT_DATABASE_URL is required (PostgreSQL database hims-user-management)",
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

  const authBaseUrl = readAuthBaseUrl();
  normalizeIdentityJwksUrl(authBaseUrl);
  const identityAuth = validateAuthConfig();
  const pgDb = createDb(requireDatabaseUrl());

  const configuratorUrl = requireUpstreamBaseUrl("CONFIGURATOR_URL");
  const masterDataUrl = requireUpstreamBaseUrl("MASTER_DATA_URL");

  const userRepository = new DrizzleUserRepository(pgDb);
  const userProvisioningRepository = new DrizzleUserProvisioningRepository(pgDb);
  const capabilityRepository = new DrizzleCapabilityRepository(pgDb);
  const roleRepository = new DrizzleRoleRepository(pgDb);
  const roleCapabilityRepository = new DrizzleRoleCapabilityRepository(pgDb);
  const userAccessRepository = new DrizzleUserAccessRepository(pgDb);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(pgDb);
  const principalAuthorizationRepository = new DrizzlePrincipalAuthorizationRepository(pgDb);

  const startupValidation = await validateRuntimeAuthorizationStartup({
    configuratorUrl,
    masterDataUrl,
    capabilityRepository,
  });
  for (const entry of startupValidation.diagnostics) {
    if (entry.level === "info") {
      app.log.info(entry.detail ?? {}, entry.message);
    }
  }
  if (!startupValidation.ok) {
    throw new Error(formatRuntimeAuthorizationStartupFailure(startupValidation.diagnostics));
  }

  const tenantModuleEntitlementPort = new HttpConfiguratorTenantModuleEntitlementAdapter({
    baseUrl: configuratorUrl,
    log: (event, message) => app.log.info(event, message),
  });
  const masterDataModuleCatalogPort = new HttpMasterDataModuleCatalogAdapter({
    baseUrl: masterDataUrl,
    log: (event, message) => app.log.info(event, message),
  });

  const principalService = createDefaultPrincipalService({
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
  });

  const trustedOrigins = readTrustedOrigins();
  const authEnv = {
    authBaseUrl,
    secret: readBetterAuthSecret(),
    jwtIssuer: identityAuth.issuer,
    jwtAudience: identityAuth.audience,
    trustedOrigins,
    disableJwtPrivateKeyEncryption:
      process.env.NODE_ENV === "test" ||
      process.env.BETTER_AUTH_DISABLE_JWT_KEY_ENCRYPTION === "true",
  };
  await repairJwksForDevelopment(pgDb, authEnv);
  const auth = createHimsBetterAuth(pgDb, authEnv, {
    userRepository,
    principalRoleProjectionRepository,
  });
  const authAccountProvisioner = createPasswordAuthAccountProvisioner(pgDb, auth);

  if (shouldRunDevelopmentBootstrap()) {
    const bootstrap = await runDevelopmentBootstrap({
      auth,
      cerbosUrl,
      db: pgDb,
      principalService,
    });
    app.log.info(
      {
        email: bootstrap.credentials.email,
        password: bootstrap.credentials.password,
        role: bootstrap.roleCode,
        tenantId: bootstrap.tenantId,
        userId: bootstrap.userId,
      },
      "Development bootstrap credentials ready",
    );
    app.log.info(
      { verifiedActions: bootstrap.verifiedActions },
      "Development bootstrap principal verified through Cerbos",
    );
  }

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
    userProvisioningRepository,
    capabilityRepository,
    roleRepository,
    roleCapabilityRepository,
    userAccessRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
    authAccountProvisioner,
    tenantModuleEntitlementPort,
    masterDataModuleCatalogPort,
  });

  return app;
}

async function main(): Promise<void> {
  const app = await createApp();
  const port = Number(
    process.env.USER_MANAGEMENT_SVC_PORT ?? process.env.PORT ?? 3005,
  );
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`User Management service listening on http://localhost:${port}`);
}

await main();
