import Fastify from "fastify";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { createRouter, DrizzleRegistrationRepo } from "@hims/registration";

const PORT = Number(process.env["PORT"] ?? 3004);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

async function main() {
  const app = Fastify({ logger: true, ajv: fastifyAjv });

  await app.register(tenantPlugin);

  const db = createDb(DATABASE_URL);
  const registrationRepo = new DrizzleRegistrationRepo(db);

  app.get("/healthz", async () => ({ status: "ok" }));

  const registrationRouter = createRouter({ registrationRepo });

  await app.register(async (scopedApp) => {
    await scopedApp.register(registrationRouter);
  }, { prefix: "/api/registration/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start registration-svc:", err);
  process.exit(1);
});
