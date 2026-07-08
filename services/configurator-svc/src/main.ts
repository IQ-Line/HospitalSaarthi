import { loadWorkspaceEnv } from "./load-workspace-env.js";
import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";

loadWorkspaceEnv();
import { validateAuthConfig, identityPlugin } from "@hims/ts-sdk-identity";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import {
  DrizzleUserRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  DrizzleCapabilityRepository,
  DrizzlePlatformAdminRepository,
  createPepRuntimeAuthFromUrls,
  principalRoleEnricherPlugin,
} from "@hims/user-management";
import { registerProblemErrorHandler } from "@hims/ts-sdk-errors";
import { correlationIdPlugin } from "@hims/ts-sdk-observability";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import {
  assertConfiguratorDatabaseIsolation,
  createDb,
  resolveDatabaseUrl,
  type DbInstance,
} from "@hims/ts-sdk-db";
import { createEventBus } from "@hims/ts-sdk-events";
import { createRouter } from "@hims/configurator/router";
import {
  CONFIGURATOR_IDENTITY_SKIP_PATH_PREFIXES,
  configuratorPublicTenantReadAuthPlugin,
  createConfiguratorAuthzTargetResolver,
  DrizzleOrganizationRepo,
  DrizzleTenantRepo,
  DrizzleTenantModuleRepo,
  DrizzleTenantIntegrationProfilesRepo,
  DrizzleSequenceConfigurationRepo,
  DrizzleTenantApiKeyRepo,
  type RunConfiguratorTransaction,
} from "@hims/configurator";
import {
  runConfiguratorDevelopmentBootstrap,
  shouldRunDevelopmentBootstrap,
} from "./bootstrap/development-bootstrap.js";
import { HttpModuleCapabilityResolverAdapter } from "./adapters/http-module-capability-resolver-adapter.js";
import { HttpPlatformModuleCatalogClient } from "./adapters/http-platform-module-catalog-client.js";
import { HttpTenantAdminProvisioningAdapter } from "./adapters/http-tenant-admin-provisioning-adapter.js";
import { HttpUserManagementEntitlementCacheInvalidator } from "./adapters/http-user-management-entitlement-cache-invalidator.js";

const PORT = Number(
  process.env["CONFIGURATOR_PORT"] ??
    process.env["CONFIGURATOR_SVC_PORT"] ??
    3001,
);
const CERBOS_URL = process.env["CERBOS_URL"];

function requireUpstreamBaseUrl(envKey: string, fallback: string): string {
  const raw = process.env[envKey]?.trim();
  if (raw && raw.length > 0) return raw.replace(/\/+$/, "");
  return fallback;
}

async function main() {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        // Default removeAdditional strips nested keys when oneOf/if-then schemas are used.
        removeAdditional: false as const,
      },
    },
  });
  try {
    await boot(app);
  } catch (err) {
    app.log.fatal({ err }, "Failed to start configurator-svc");
    process.exit(1);
  }
}

async function boot(app: FastifyInstance): Promise<void> {
  // Correlation id first (app root): every route gets an id bound to request.log
  // and echoed on the response header.
  await app.register(correlationIdPlugin);
  // RFC 7807 problem+json for every error; inherited by all child scopes.
  registerProblemErrorHandler(app);

  if (!CERBOS_URL) {
    throw new Error("CERBOS_URL environment variable is required");
  }
  // Capture the narrowed (string) value: the module-level const's narrowing does not propagate
  // into the nested `registerConfiguratorApi` closure where authzPlugin is registered.
  const cerbosUrl: string = CERBOS_URL;

  await registerOpenApiDocs(app, {
    serviceId: "configurator",
    title: "Configurator API",
    version: "1.0.0",
    description: "Organization, tenant, and tenant-module provisioning.",
    apiPrefix: "/api/configurator/v1",
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      internalServiceKey: {
        type: "apiKey",
        in: "header",
        name: "x-configurator-internal-key",
        description:
          "Must match CONFIGURATOR_INTERNAL_API_KEY on configurator-svc (internal routes only).",
      },
    },
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  const databaseUrl = resolveDatabaseUrl();
  const db = createDb(databaseUrl);
  await assertConfiguratorDatabaseIsolation({
    db,
    connectionString: databaseUrl,
  });

  if (shouldRunDevelopmentBootstrap()) {
    app.log.warn(
      "PLATFORM_DEV_BOOTSTRAP=true — prefer `make seed` for deterministic dev data",
    );
    const bootstrap = await runConfiguratorDevelopmentBootstrap(db);
    app.log.info(
      {
        orgId: bootstrap.orgId,
        tenantId: bootstrap.tenantId,
        tenantModuleIds: bootstrap.tenantModuleIds,
      },
      "Configurator development bootstrap ready",
    );
  }

  const organizationRepo = new DrizzleOrganizationRepo(db);
  const tenantRepo = new DrizzleTenantRepo(db);
  const tenantModuleRepo = new DrizzleTenantModuleRepo(db);
  const tenantIntegrationProfilesRepo = new DrizzleTenantIntegrationProfilesRepo(db);
  const sequenceConfigurationRepo = new DrizzleSequenceConfigurationRepo(db);
  const tenantApiKeyRepo = new DrizzleTenantApiKeyRepo(db);

  const runConfiguratorTransaction: RunConfiguratorTransaction = (fn) =>
    db.transaction(async (tx) =>
      fn({
        organizationRepo: new DrizzleOrganizationRepo(tx as DbInstance),
        tenantRepo: new DrizzleTenantRepo(tx as DbInstance),
        tenantModuleRepo: new DrizzleTenantModuleRepo(tx as DbInstance),
      }),
    );

  const eventBus = createEventBus({ type: "in-process" });
  await eventBus.connect();

  app.addHook("onClose", async () => {
    await eventBus.disconnect();
  });

  // Identity + Cerbos PEP are UNCONDITIONAL (no ENABLE_AUTH escape hatch): configurator exposes
  // cross-tenant platform-admin data, so protected routes always require a verified principal and
  // a PDP decision. Parity with billing/registration/user-management.
  const identityAuth = validateAuthConfig();

  const userManagementBaseUrl = requireUpstreamBaseUrl(
    "USER_MANAGEMENT_URL",
    "http://localhost:3005",
  );
  const masterDataBaseUrl = requireUpstreamBaseUrl(
    "MASTER_DATA_URL",
    "http://localhost:8010",
  );
  const configuratorSelfUrl = requireUpstreamBaseUrl(
    "CONFIGURATOR_URL",
    `http://localhost:${PORT}`,
  );
  const umInternalApiKey = process.env["UM_INTERNAL_API_KEY"]?.trim() ?? "";
  const masterDataInternalApiKey =
    process.env["MASTER_DATA_INTERNAL_API_KEY"]?.trim() ?? "";

  const logFn = (event: Record<string, unknown>, message: string) =>
    app.log.info(event, message);

  // Singleton (static internal key, TTL cache): the internal entitlement route always needs the
  // Master Data catalog to drop orphaned tenant modules, so it is built unconditionally — a missing
  // key just means the S2S call is rejected (fail-closed) until it is set to Master Data's value.
  const platformModuleCatalog = new HttpPlatformModuleCatalogClient({
    baseUrl: masterDataBaseUrl,
    internalApiKey: masterDataInternalApiKey,
    log: logFn,
  });
  if (masterDataInternalApiKey.length === 0) {
    app.log.warn(
      "MASTER_DATA_INTERNAL_API_KEY unset — configurator cannot authenticate to Master Data " +
        "/internal/modules; tenant entitlement hydration will fail until it is set (same value " +
        "as master-data).",
    );
  }

  const entitlementCacheInvalidator =
    umInternalApiKey.length > 0
      ? new HttpUserManagementEntitlementCacheInvalidator({
          baseUrl: userManagementBaseUrl,
          internalApiKey: umInternalApiKey,
          log: logFn,
        })
      : undefined;

  if (entitlementCacheInvalidator === undefined) {
    app.log.warn(
      "UM_INTERNAL_API_KEY unset — tenant entitlement cache will not be busted on module toggle",
    );
  }

  // Cerbos PEP wiring: the UM principal enricher reads the SAME shared operational DB (configurator
  // + user_management are schemas on hims_dev), so it wires off the same `db` connection.
  const userRepository = new DrizzleUserRepository(db);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(db);
  const principalAuthorizationRepository = new DrizzlePrincipalAuthorizationRepository(db);
  const capabilityRepository = new DrizzleCapabilityRepository(db);
  // Bounded platform scope: the same shared operational DB carries user_management.platform_admins,
  // so the enricher decides `scope:platform` for cross-tenant provisioning off this connection.
  const platformAdminRepository = new DrizzlePlatformAdminRepository(db);

  const { principalService } = createPepRuntimeAuthFromUrls({
    configuratorUrl: configuratorSelfUrl,
    masterDataUrl: masterDataBaseUrl,
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
    platformAdminRepository,
    capabilityRepository,
    // Platform service: a super-admin's capabilities must NOT be intersected with their home
    // tenant's entitled modules (a platform operator's tenant need not entitle `configurator`,
    // which would otherwise strip `configurator:*` → 403). See plan "Top integration risk".
    runtimeEntitlementIntersection: false,
    log: logFn,
  });

  await assertCerbosReachable(cerbosUrl);

  await app.register(configuratorPublicTenantReadAuthPlugin);

  // Identity at app root so skipPathPrefixes match full request URLs (integration-hub S2S).
  await app.register(identityPlugin, {
    ...identityAuth,
    skipPathPrefixes: [...CONFIGURATOR_IDENTITY_SKIP_PATH_PREFIXES, "/docs"],
  });

  async function registerConfiguratorApi(api: FastifyInstance): Promise<void> {
    await api.register(multipart, {
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
      },
    });

    // Enricher + authz MUST register BEFORE the router: authzPlugin's onRoute hook only sees routes
    // added after it in this scope. Registering after the router would leave every route ungated
    // (silent fail-open). Order mirrors billing-svc: identity(root) → enricher → authz → router.
    await api.register(principalRoleEnricherPlugin, {
      principalService,
      userRepository,
    });
    await api.register(authzPlugin, {
      cerbosUrl,
      resolveTarget: createConfiguratorAuthzTargetResolver(),
    });

    await api.register(
      createRouter({
        db,
        platformModuleCatalog,
        organizationRepo,
        tenantRepo,
        tenantModuleRepo,
        tenantIntegrationProfilesRepo,
        sequenceConfigurationRepo,
        tenantApiKeyRepo,
        runConfiguratorTransaction,
        eventBus,
        entitlementCacheInvalidator,
        createInfrastructureCatalog: (authorization) =>
          new HttpModuleCapabilityResolverAdapter({
            userManagementBaseUrl,
            masterDataBaseUrl,
            authorization,
            log: logFn,
          }),
        createModuleCapabilityResolver: (authorization) =>
          new HttpModuleCapabilityResolverAdapter({
            userManagementBaseUrl,
            masterDataBaseUrl,
            authorization,
            log: logFn,
          }),
        createAdminProvisioner: (authorization) =>
          new HttpTenantAdminProvisioningAdapter({
            userManagementBaseUrl,
            authorization,
            log: logFn,
          }),
      }),
    );
  }

  await app.register(registerConfiguratorApi, { prefix: "/api/configurator/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Configurator service listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  // Only reached if Fastify construction itself failed — no logger can exist yet.
  console.error("Failed to start configurator-svc:", err);
  process.exit(1);
});
