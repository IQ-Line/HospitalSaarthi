import Fastify from "fastify";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createRouter } from "@hims/frontdesk";

const PORT = Number(process.env["PORT"] ?? 3004);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(tenantPlugin);

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(createRouter({}), { prefix: "/api/frontdesk/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start frontdesk-svc:", err);
  process.exit(1);
});
