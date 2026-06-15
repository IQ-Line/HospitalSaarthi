import Fastify from "fastify";
import { validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import {
  applyRecordFoundationSchemaMigration,
  createRouter,
  DrizzleCareContextRepo,
  DrizzleBundleRepo,
} from "@hims/record-foundation";

const PORT = Number(
  process.env["RECORD_FOUNDATION_PORT"] ?? process.env["RECORD_FOUNDATION_SVC_PORT"] ?? 3009,
);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const SKIP_MIGRATE = process.env["RECORD_FOUNDATION_SKIP_MIGRATE"] === "true";
const ENABLE_AUTH = process.env["ENABLE_AUTH"] === "true";

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

async function main() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for record-foundation-svc");
  }

  const app = Fastify({ logger: true, ajv: fastifyAjv });

  await registerOpenApiDocs(app, {
    serviceId: "record-foundation",
    title: "Record Foundation API",
    version: "1.0.0",
    description: "Care-context registry and FHIR bundle vault.",
    apiPrefix: "/api/record-foundation/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  if (!SKIP_MIGRATE) {
    await applyRecordFoundationSchemaMigration(DATABASE_URL);
    app.log.info("Record Foundation schema migration applied");
  }

  const db = createDb(DATABASE_URL);

  const careContextRepo = new DrizzleCareContextRepo(db);
  const bundleRepo = new DrizzleBundleRepo(db);

  const recordFoundationRouter = createRouter({
    careContextRepo,
    bundleRepo,
  });

  await app.register(async (api) => {
    if (ENABLE_AUTH) {
      const { identityPlugin } = await import("@hims/ts-sdk-identity");
      await api.register(identityPlugin, validateAuthConfig());
    }
    await api.register(tenantPlugin);

    await api.register(async (scopedApp) => {
      await scopedApp.register(recordFoundationRouter);
    }, { prefix: "/record-foundation/v1" });
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`record-foundation-svc listening on port ${PORT}`);
}

main().catch((err) => {
  console.error("Failed to start record-foundation-svc:", err);
  process.exit(1);
});
