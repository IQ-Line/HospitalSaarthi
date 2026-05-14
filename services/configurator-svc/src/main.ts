import Fastify from "fastify";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb, type DbInstance } from "@hims/ts-sdk-db";
import {
  createRouter,
  DrizzleOrganizationRepo,
  DrizzleTenantRepo,
  DrizzleTenantModuleRepo,
  type RunConfiguratorTransaction,
} from "@hims/configurator";

const PORT = Number(process.env["PORT"] ?? 3001);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(tenantPlugin);

  const db = createDb(DATABASE_URL);

  const organizationRepo = new DrizzleOrganizationRepo(db);
  const tenantRepo = new DrizzleTenantRepo(db);
  const tenantModuleRepo = new DrizzleTenantModuleRepo(db);

  const runConfiguratorTransaction: RunConfiguratorTransaction = (fn) =>
    db.transaction(async (tx) =>
      fn({
        organizationRepo: new DrizzleOrganizationRepo(tx as DbInstance),
        tenantRepo: new DrizzleTenantRepo(tx as DbInstance),
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
