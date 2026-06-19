import Fastify from "fastify";
import { validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import {
  applyAnalyticsSchemaMigration,
  createRouter,
} from "@hims/analytics";

const PORT = Number(
  process.env["ANALYTICS_PORT"] ?? process.env["ANALYTICS_SVC_PORT"] ?? 3008,
);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const ENABLE_AUTH = process.env["ENABLE_AUTH"] === "true";

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

async function main() {
  if (!DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required for analytics-svc");
  }

  const app = Fastify({ logger: true, ajv: fastifyAjv });

  await registerOpenApiDocs(app, {
    serviceId: "analytics",
    title: "Analytics API",
    version: "1.0.0",
    description: "Operational analytics and reporting snapshots.",
    apiPrefix: "/api/analytics/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  if (process.env["ANALYTICS_SKIP_MIGRATE"] !== "true") {
    await applyAnalyticsSchemaMigration(DATABASE_URL);
    app.log.info("Analytics schema migration applied (or already up to date)");
  }

  const db = createDb(DATABASE_URL);
  const analyticsRouter = createRouter({ db });

  await app.register(async (api) => {
    if (ENABLE_AUTH) {
      const { identityPlugin } = await import("@hims/ts-sdk-identity");
      await api.register(identityPlugin, validateAuthConfig());
    }
    await api.register(tenantPlugin);

    await api.register(async (scopedApp) => {
      await scopedApp.register(analyticsRouter);
    }, { prefix: "/analytics/v1" });
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start analytics-svc:", err);
  process.exit(1);
});
