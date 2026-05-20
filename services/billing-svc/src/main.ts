import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { createRouter } from "@hims/billing";

const PORT = Number(process.env["BILLING_SVC_PORT"] ?? 3003);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
/** Safe placeholder when mock mode injects a tenant (not the live dev-bootstrap UUID). */
const MOCK_FALLBACK_TENANT_ID = "00000000-0000-0000-0000-000000000007";
const USE_MOCK_DATA = process.env["BILLING_USE_MOCK_DATA"] === "true";
const ALLOW_DESK_PRICE_OVERRIDE =
  process.env["BILLING_ALLOW_DESK_PRICE_OVERRIDE"] === "true";

async function main() {
  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "billing",
    title: "Billing API",
    version: "1.0.0",
    description: "Billing module HTTP surface.",
    apiPrefix: "/api/billing/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  const db = USE_MOCK_DATA ? undefined : createDb(DATABASE_URL);
  if (USE_MOCK_DATA) {
    app.log.warn("BILLING_USE_MOCK_DATA=true — charges are in-memory only");
  } else if (!DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required when BILLING_USE_MOCK_DATA is not true");
  }

  await app.register(async (api) => {
    if (USE_MOCK_DATA) {
      api.addHook("onRequest", async (request) => {
        if (!request.headers["x-tenant-id"] && !request.headers["iq_tenant_id"]) {
          request.headers["x-tenant-id"] =
            process.env["BILLING_DEV_TENANT_ID"] ?? MOCK_FALLBACK_TENANT_ID;
        }
      });
    }
    await api.register(tenantPlugin);
    await api.register(
      createRouter({
        db,
        useMock: USE_MOCK_DATA,
        allowDeskPriceOverride: ALLOW_DESK_PRICE_OVERRIDE,
      }),
    );
  }, { prefix: "/api/billing/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start billing-svc:", err);
  process.exit(1);
});
