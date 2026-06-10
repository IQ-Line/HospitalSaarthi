import "./load-env.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import { applyIpdSchemaMigration, createRouter } from "@hims/ipd";

const PORT = Number(process.env["IPD_SVC_PORT"] ?? process.env["IPD_PORT"] ?? 3008);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const USE_MOCK_DATA = process.env["IPD_USE_MOCK_DATA"] !== "false";
const SKIP_MIGRATE = process.env["IPD_SKIP_MIGRATE"] === "true";
const ENABLE_AUTH = process.env["ENABLE_AUTH"] === "true";

const IPD_DEV_TENANT_ID =
  process.env["IPD_DEV_TENANT_ID"] ?? "00000000-0000-0000-0000-000000000007";

const serviceRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serviceRoot, "../../..");

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
    serviceId: "ipd",
    title: "IPD — Admission intake",
    version: "1.0.0",
    description: "Admission queue, create/edit admissions. Phase 0 scaffold.",
    apiPrefix: "/api/ipd/v1",
    staticSpec: {
      path: "specs/openapi/ipd.v1.yaml",
      baseDir: repoRoot,
    },
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  const db = USE_MOCK_DATA ? undefined : createDb(DATABASE_URL);
  if (USE_MOCK_DATA) {
    app.log.warn("IPD_USE_MOCK_DATA=true — in-memory admissions (default for local Swagger)");
  } else {
    if (!DATABASE_URL.trim()) {
      throw new Error("DATABASE_URL is required when IPD_USE_MOCK_DATA=false");
    }
    if (!SKIP_MIGRATE) {
      await applyIpdSchemaMigration(DATABASE_URL);
    }
  }

  const eventBus = new InProcessEventBus();
  const ipdRouter = createRouter({ db, useMock: USE_MOCK_DATA, eventBus });

  await app.register(async (api) => {
    if (ENABLE_AUTH) {
      const { identityPlugin } = await import("@hims/ts-sdk-identity");
      await api.register(identityPlugin, validateAuthConfig());
    }

    api.addHook("onRequest", async (request) => {
      if (USE_MOCK_DATA) {
        const headers = request.headers;
        const tenant =
          (typeof headers["iq_tenant_id"] === "string" && headers["iq_tenant_id"]) ||
          (typeof headers["x-tenant-id"] === "string" && headers["x-tenant-id"]) ||
          IPD_DEV_TENANT_ID;
        request.headers["iq_tenant_id"] = tenant;
        request.headers["x-tenant-id"] = tenant;
      }
    });

    await api.register(tenantPlugin);
    await api.register(ipdRouter);
  }, { prefix: "/api/ipd/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`IPD API: http://localhost:${PORT}/api/ipd/v1/admissions`);
  app.log.info(`Swagger UI: http://localhost:${PORT}/docs`);
}

main().catch((err) => {
  console.error("Failed to start ipd-svc:", err);
  process.exit(1);
});
