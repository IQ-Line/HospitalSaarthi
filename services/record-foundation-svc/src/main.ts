import Fastify from "fastify";
import { validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import {
  createRouter,
  DrizzleCareContextRepo,
  DrizzleBundleManifestRepo,
  DrizzleBundleStorageRepo,
  DrizzleExternalHealthRecordRepo,
  DrizzleTimelineIndexRepo,
  DrizzleErasureLogRepo,
} from "@hims/record-foundation";

const PORT = Number(
  process.env["RECORD_FOUNDATION_PORT"] ?? process.env["RECORD_FOUNDATION_SVC_PORT"] ?? 3006,
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
  const app = Fastify({ logger: true, ajv: fastifyAjv });

  await registerOpenApiDocs(app, {
    serviceId: "record-foundation",
    title: "Record Foundation API",
    version: "1.0.0",
    description: "Care-context registry, immutable FHIR Document Bundle vault, external HIU bundle inbox.",
    apiPrefix: "/api/record-foundation/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  const db = createDb(DATABASE_URL);
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const careContextRepo = new DrizzleCareContextRepo(db);
  const bundleManifestRepo = new DrizzleBundleManifestRepo(db);
  const bundleStorageRepo = new DrizzleBundleStorageRepo(db);
  const externalHealthRecordRepo = new DrizzleExternalHealthRecordRepo(db);
  const timelineIndexRepo = new DrizzleTimelineIndexRepo(db);
  const erasureLogRepo = new DrizzleErasureLogRepo(db);

  const recordFoundationRouter = createRouter({
    careContextRepo,
    bundleManifestRepo,
    bundleStorageRepo,
    externalHealthRecordRepo,
    timelineIndexRepo,
    erasureLogRepo,
    eventBus,
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
}

main().catch((err) => {
  console.error("Failed to start record-foundation-svc:", err);
  process.exit(1);
});
