import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createRouter } from "@hims/frontdesk";

const PORT = Number(process.env["FRONTDESK_SVC_PORT"] ?? 3004);

async function main() {
  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "frontdesk",
    title: "Frontdesk API",
    version: "1.0.0",
    description: "Frontdesk module HTTP surface.",
    apiPrefix: "/api/frontdesk/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(async (api) => {
    await api.register(tenantPlugin);
    await api.register(createRouter({}), { prefix: "/frontdesk/v1" });
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start frontdesk-svc:", err);
  process.exit(1);
});
