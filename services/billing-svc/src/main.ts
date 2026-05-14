import Fastify from "fastify";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createRouter } from "@hims/billing";

const PORT = Number(process.env["PORT"] ?? 3003);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(tenantPlugin);

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(createRouter({}), { prefix: "/api/billing/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start billing-svc:", err);
  process.exit(1);
});
