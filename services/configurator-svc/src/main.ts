import Fastify from "fastify";
import { createDb, type DbInstance } from "@hims/ts-sdk-db";
import {
  createRouter,
  DrizzleOrganizationRepo,
  DrizzleTenantRepo,
  DrizzleTenantModuleRepo,
  type RunConfiguratorTransaction,
} from "@hims/configurator";

const PORT = Number(process.env["CONFIGURATOR_PORT"] ?? 3001);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";

async function main() {
  const app = Fastify({ logger: true });

  // No global `tenantPlugin` here: organizations + tenant discovery are
  // bootstrap/admin APIs (org-scoped queries, no `request.tenantId` usage).
  // EMPI and other patient-facing services keep strict tenant headers.

  const db = createDb(DATABASE_URL);

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

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(
    createRouter({
      organizationRepo,
      tenantRepo,
      tenantModuleRepo,
      runConfiguratorTransaction,
    }),
    { prefix: "/api/configurator/v1" },
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start configurator-svc:", err);
  process.exit(1);
});
