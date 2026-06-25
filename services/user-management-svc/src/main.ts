import sensible from "@fastify/sensible";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import {
  assertUserManagementDatabaseIsolation,
  createDb,
  resolveDatabaseUrl,
} from "@hims/ts-sdk-db";
import { createEventBus } from "@hims/ts-sdk-events";
import { identityPlugin, validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import Fastify, { type FastifyInstance } from "fastify";
import { createUserManagementAuthzTargetResolver } from "./authz-target-resolver.js";
import {
  createHimsBetterAuth,
  repairJwksForDevelopment,
} from "./auth/create-hims-better-auth.js";
import { createAuthPasswordAdmin } from "./auth/create-auth-password-admin.js";
import { createPasswordAuthAccountProvisioner } from "./auth/create-password-auth-account-provisioner.js";
import { registerBetterAuth } from "./auth/register-better-auth.js";
import {
  runDevelopmentBootstrap,
  shouldRunDevelopmentBootstrap,
} from "./bootstrap/development-bootstrap.js";
import { repairPlatformSuperAdminCapabilitySnapshots } from "./bootstrap/repair-platform-super-admin.js";
import {
  DrizzleCapabilityRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  DrizzleRoleCapabilityRepository,
  DrizzleRoleRepository,
  DrizzleUserAccessRepository,
  DrizzleUserProvisioningRepository,
  DrizzleUserRepository,
  createRuntimeEntitlementPrincipalWiring,
  formatRuntimeAuthorizationStartupFailure,
  registerTenantEntitlementCacheEventConsumers,
  validateRuntimeAuthorizationStartup,
  principalRoleEnricherPlugin,
} from "../../../modules/user-management/src/index.js";
import { deactivateSupersededLegacyCapabilities } from "../../../modules/user-management/src/dev/deactivate-superseded-legacy-capabilities.js";
import {
  HttpConfiguratorTenantModuleEntitlementAdapter,
} from "../../../modules/user-management/src/adapters/http-configurator-tenant-module-entitlement-adapter.js";
import {
  HttpMasterDataModuleCatalogAdapter,
} from "../../../modules/user-management/src/adapters/http-master-data-module-catalog-adapter.js";
import { tenantApiKeyAuthPlugin } from "@hims/user-management";
import { registerUserManagementApi } from "./openapi/register-user-management-api.js";
import { DrizzleTenantApiKeyValidator } from "./adapters/drizzle-tenant-api-key-validator.js";
import { createAccessTokenIssuer } from "./auth/issue-access-jwt.js";
import { DrizzleAuthSessionRevoker } from "./auth/revoke-auth-sessions.js";

function requireUpstreamBaseUrl(envKey: string): string {
  const raw = process.env[envKey]?.trim();
  if (!raw || raw.length === 0) {
    throw new Error(
      `${envKey} is required for tenant module entitlements and Master Data module catalog integration`,
    );
  }
  return raw.replace(/\/+$/, "");
}

function readAuthBaseUrl(): string {
  const raw = process.env.AUTH_BASE_URL?.trim();
  if (!raw || raw.length === 0) {
    throw new Error(
      "AUTH_BASE_URL is required (backend API origin; equals JWT_ISSUER and JWKS_URL prefix)",
    );
  }
  return raw.replace(/\/+$/, "");
}

function readWebPublicOrigin(): string | undefined {
  const raw = process.env.WEB_PUBLIC_ORIGIN?.trim();
  if (!raw || raw.length === 0) {
    return undefined;
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

  await registerOpenApiDocs(app, {
    serviceId: "user-management",
    title: "HIMS User Management API",
    version: "1.0.0",
    description:
      "Tenant-scoped users, roles, capabilities, assignments, and principal enrichment.",
    apiPrefix: "/api/user-management",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  if (!process.env.CERBOS_URL || process.env.CERBOS_URL.trim() === "") {
    throw new Error("CERBOS_URL is required for authorization service");
  }
  const cerbosUrl = process.env.CERBOS_URL.trim();

  const identityAuth = validateAuthConfig();
  const authBaseUrl = readAuthBaseUrl();
  const webPublicOrigin = readWebPublicOrigin();
  const databaseUrl = resolveDatabaseUrl();
  const pgDb = createDb(databaseUrl);
  await assertUserManagementDatabaseIsolation({
    db: pgDb,
    connectionString: databaseUrl,
  });

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

  const legacyCleanup = await deactivateSupersededLegacyCapabilities(pgDb);
  if (legacyCleanup.deactivated > 0) {
    app.log.info(
      { deactivatedKeys: legacyCleanup.deactivatedKeys },
      "Deactivated superseded legacy capability catalog rows",
    );
  }

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

  const umInternalApiKey = process.env.UM_INTERNAL_API_KEY?.trim();
  const tenantModuleEntitlementPort = new HttpConfiguratorTenantModuleEntitlementAdapter({
    baseUrl: configuratorUrl,
    umInternalApiKey,
    log: (event, message) => app.log.info(event, message),
  });
  const masterDataModuleCatalogPort = new HttpMasterDataModuleCatalogAdapter({
    baseUrl: masterDataUrl,
    log: (event, message) => app.log.info(event, message),
  });

  const { tenantEntitlementResolver, principalService } = createRuntimeEntitlementPrincipalWiring({
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
    capabilityRepository,
    tenantModuleEntitlementPort,
    masterDataModuleCatalogPort,
    log: (event, message) => app.log.info(event, message),
  });

  await registerTenantEntitlementCacheEventConsumers(
    eventBus,
    tenantEntitlementResolver,
    tenantModuleEntitlementPort,
  );

  const trustedOrigins = [
    ...new Set([
      ...readTrustedOrigins(),
      ...(webPublicOrigin ? [webPublicOrigin] : []),
    ]),
  ];
  const authEnv = {
    authBaseUrl,
    webPublicOrigin,
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
  const authPasswordAdmin = createAuthPasswordAdmin(auth);
  const authAccountProvisioner = createPasswordAuthAccountProvisioner(pgDb, auth);

  if (process.env.NODE_ENV !== "production") {
    const repair = await repairPlatformSuperAdminCapabilitySnapshots(pgDb);
    if (repair.repaired) {
      app.log.info(
        { capabilityCount: repair.capabilityCount },
        "Platform super-admin capability snapshots refreshed",
      );
    }
  }

  if (shouldRunDevelopmentBootstrap()) {
    app.log.warn(
      "PLATFORM_DEV_BOOTSTRAP=true — prefer `make seed` for deterministic dev data",
    );
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

  const accessTokenIssuer = createAccessTokenIssuer(pgDb, authEnv, {
    userRepository,
    principalRoleProjectionRepository,
  });
  const authSessionRevoker = new DrizzleAuthSessionRevoker(pgDb, userRepository);

  const tenantApiKeyValidator = new DrizzleTenantApiKeyValidator(pgDb);
  await app.register(tenantApiKeyAuthPlugin, { validator: tenantApiKeyValidator });

  await app.register(identityPlugin, {
    ...identityAuth,
    skipPathPrefixes: ["/api/auth", "/docs", "/api/user-management/auth/api-key"],
  });

  await assertCerbosReachable(cerbosUrl);

  await app.register(principalRoleEnricherPlugin, {
    principalService,
    userRepository,
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
    authPasswordAdmin,
    tenantModuleEntitlementPort,
    masterDataModuleCatalogPort,
    tenantEntitlementResolver,
    internalEntitlementCacheApiKey: umInternalApiKey,
    accessTokenIssuer,
    authSessionRevoker,
  });

  return app;
}

async function main(): Promise<void> {
  const port = Number(
    process.env.USER_MANAGEMENT_SVC_PORT ?? process.env.PORT ?? 3005,
  );
  try {
    const app = await createApp();
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`User Management service listening on http://localhost:${port}`);
  } catch (err) {
    console.error("Failed to start user-management-svc:", err);
    process.exit(1);
  }
}

await main();
