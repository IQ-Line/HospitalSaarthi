import Fastify, { type FastifyInstance } from "fastify";
import { validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerProblemErrorHandler } from "@hims/ts-sdk-errors";
import { correlationIdPlugin } from "@hims/ts-sdk-observability";
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
/** Match store-bundle MAX_BUNDLE_SIZE_BYTES (50 MiB) plus JSON wrapper overhead. */
const MAX_BUNDLE_BODY_BYTES = 52 * 1024 * 1024;

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

async function main() {
  const app = Fastify({
    logger: true,
    ajv: fastifyAjv,
    bodyLimit: MAX_BUNDLE_BODY_BYTES,
  });
  try {
    await boot(app);
  } catch (err) {
    app.log.fatal({ err }, "Failed to start record-foundation-svc");
    process.exit(1);
  }
}

async function boot(app: FastifyInstance): Promise<void> {
  // Correlation id first (app root): every route gets an id bound to request.log
  // and echoed on the response header.
  await app.register(correlationIdPlugin);
  // RFC 7807 problem+json for every error; inherited by all child scopes.
  registerProblemErrorHandler(app);

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for record-foundation-svc");
  }

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
  // Only reached if Fastify construction itself failed — no logger can exist yet.
  console.error("Failed to start record-foundation-svc:", err);
  process.exit(1);
});
