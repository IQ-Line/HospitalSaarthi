import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import {
  assertConfiguratorDatabaseIsolation,
  createDb,
  resolveDatabaseUrl,
  type DbInstance,
} from "@hims/ts-sdk-db";
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

const PORT = Number(
  process.env["CONFIGURATOR_PORT"] ??
    process.env["CONFIGURATOR_SVC_PORT"] ??
    3001,
);

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

  // `tenantPlugin` only under `/api`: org + tenant discovery are bootstrap/admin
  // routes. EMPI and other patient-facing services keep stricter tenant headers.
  await app.register(async (api) => {
    await api.register(tenantPlugin);

    await api.register(
      createRouter({
        organizationRepo,
        tenantRepo,
        tenantModuleRepo,
        runConfiguratorTransaction,
      }),
      { prefix: "/configurator/v1" },
    );
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Configurator service listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error("Failed to start configurator-svc:", err);
  process.exit(1);
});
