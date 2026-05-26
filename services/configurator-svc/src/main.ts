import Fastify, { type FastifyInstance } from "fastify";
import { validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import {
  assertConfiguratorDatabaseIsolation,
  createDb,
  resolveDatabaseUrl,
  type DbInstance,
} from "@hims/ts-sdk-db";
import { createEventBus } from "@hims/ts-sdk-events";
import {
  createRouter,
  DrizzleOrganizationRepo,
  DrizzleTenantRepo,
  DrizzleTenantModuleRepo,
  type RunConfiguratorTransaction,
} from "@hims/configurator";
import {
  runConfiguratorDevelopmentBootstrap,
  shouldRunDevelopmentBootstrap,
} from "./bootstrap/development-bootstrap.js";
import { HttpModuleCapabilityResolverAdapter } from "./adapters/http-module-capability-resolver-adapter.js";
import { HttpTenantAdminProvisioningAdapter } from "./adapters/http-tenant-admin-provisioning-adapter.js";

const PORT = Number(
  process.env["CONFIGURATOR_PORT"] ??
    process.env["CONFIGURATOR_SVC_PORT"] ??
    3001,
);

function requireUpstreamBaseUrl(envKey: string, fallback: string): string {
  const raw = process.env[envKey]?.trim();
  if (raw && raw.length > 0) return raw.replace(/\/+$/, "");
  return fallback;
}

async function main() {
  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "configurator",
    title: "Configurator API",
    version: "1.0.0",
    description: "Organization, tenant, and tenant-module provisioning.",
    apiPrefix: "/api/configurator/v1",
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

  const isProduction = process.env["NODE_ENV"] === "production";
  const enableAuth = process.env["ENABLE_AUTH"] === "true";
  if (isProduction && !enableAuth) {
    throw new Error("ENABLE_AUTH=true is required when NODE_ENV=production");
  }
  const identityAuth = enableAuth ? validateAuthConfig() : undefined;

  const userManagementBaseUrl = requireUpstreamBaseUrl(
    "USER_MANAGEMENT_URL",
    "http://localhost:3005",
  );
  const masterDataBaseUrl = requireUpstreamBaseUrl(
    "MASTER_DATA_URL",
    "http://localhost:8010",
  );

  const logFn = (event: Record<string, unknown>, message: string) =>
    app.log.info(event, message);

  async function registerConfiguratorApi(api: FastifyInstance): Promise<void> {
    if (identityAuth) {
      const { identityPlugin } = await import("@hims/ts-sdk-identity");
      await api.register(identityPlugin, identityAuth);
    }
    await api.register(
      createRouter({
        organizationRepo,
        tenantRepo,
        tenantModuleRepo,
        runConfiguratorTransaction,
        eventBus,
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
  console.error("Failed to start configurator-svc:", err);
  process.exit(1);
});
