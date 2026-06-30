import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import {
  applyInventorySchemaMigration,
  createRouter,
  HttpMasterDataGateway,
} from "@hims/inventory";

const PORT = Number(process.env["INVENTORY_SVC_PORT"] ?? 3008);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const CERBOS_URL = process.env["CERBOS_URL"];
const MASTER_DATA_URL = process.env["MASTER_DATA_URL"] ?? "http://localhost:8010";
const INVENTORY_DEV_TENANT_ID =
  process.env["INVENTORY_DEV_TENANT_ID"] ?? "f47ac10b-58cc-4372-a567-0e02b2c3d480";

async function main() {
  if (!CERBOS_URL) {
    throw new Error("CERBOS_URL environment variable is required");
  }

  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "inventory",
    title: "Inventory API",
    version: "1.0.0",
    description: "Inventory module HTTP surface (stores, items, GRN, stock, indents).",
    apiPrefix: "/api/inventory/v1",
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
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
  const masterDataGateway = new HttpMasterDataGateway(MASTER_DATA_URL, {
    warn: (detail, message) => app.log.warn(detail, message),
  });
  const inventoryRouter = createRouter({ db, masterDataGateway });

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
