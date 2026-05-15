import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createRouter } from "@hims/billing";

const PORT = Number(process.env["BILLING_SVC_PORT"] ?? 3003);

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

  await app.register(async (api) => {
    await api.register(tenantPlugin);
    await api.register(createRouter({}), { prefix: "/billing/v1" });
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start billing-svc:", err);
  process.exit(1);
});
