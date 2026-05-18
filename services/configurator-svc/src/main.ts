import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb, type DbInstance } from "@hims/ts-sdk-db";
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

function requireConfiguratorDatabaseUrl(): string {
  const databaseUrl = (
    process.env.CONFIGURATOR_DATABASE_URL ?? process.env.DATABASE_URL
  )?.trim();
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error(
      "CONFIGURATOR_DATABASE_URL is required (PostgreSQL database hims-configurator)",
    );
  }
  return databaseUrl;
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

  const db = createDb(requireConfiguratorDatabaseUrl());

  if (shouldRunDevelopmentBootstrap()) {
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
}

main().catch((err) => {
  console.error("Failed to start configurator-svc:", err);
  process.exit(1);
});
