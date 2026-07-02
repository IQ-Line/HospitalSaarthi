import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import {
  applyInventorySchemaMigration,
  createRouter,
  DrizzleInventoryItemRepository,
} from "@hims/inventory";

const PORT = Number(process.env["INVENTORY_SVC_PORT"] ?? 3008);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";

async function main() {
  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "inventory",
    title: "Inventory API",
    version: "1.0.0",
    description: "Inventory module HTTP surface (stores, items, GRN, stock, indents).",
    apiPrefix: "/api/inventory/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  if (!DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required for inventory-svc");
  }

  if (process.env["INVENTORY_SKIP_MIGRATE"] !== "true") {
    await applyInventorySchemaMigration(DATABASE_URL);
    app.log.info("Inventory schema migration applied (or already up to date)");
  }

  const db = createDb(DATABASE_URL);
  const itemRepo = new DrizzleInventoryItemRepository(db);
  const inventoryRouter = createRouter({ itemRepo });

  await app.register(async (api) => {
    await api.register(tenantPlugin);
    await api.register(inventoryRouter);
  }, { prefix: "/api/inventory/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`inventory-svc listening on port ${PORT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
