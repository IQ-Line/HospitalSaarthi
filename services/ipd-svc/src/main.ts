import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { createRouter } from "@hims/ipd";

const PORT = Number(process.env["IPD_SVC_PORT"] ?? 3008);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const USE_MOCK_DATA = process.env["IPD_USE_MOCK_DATA"] !== "false";

const IPD_DEV_TENANT_ID =
  process.env["IPD_DEV_TENANT_ID"] ?? "00000000-0000-0000-0000-000000000007";

const serviceRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serviceRoot, "../../..");

async function main() {
  const app = Fastify({ logger: true });

  await registerOpenApiDocs(app, {
    serviceId: "ipd",
    title: "IPD — Admission intake",
    version: "1.0.0",
    description: "Admission queue, new/edit admission, activate. Admission table only.",
    apiPrefix: "/api/ipd/v1",
    staticSpec: {
      path: "specs/openapi/ipd.v1.yaml",
      baseDir: repoRoot,
    },
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  const db = USE_MOCK_DATA ? undefined : createDb(DATABASE_URL);
  if (USE_MOCK_DATA) {
    app.log.warn("IPD_USE_MOCK_DATA=true — in-memory admissions (default for Swagger testing)");
  } else if (!DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required when IPD_USE_MOCK_DATA=false");
  }

  await app.register(async (api) => {
    api.addHook("onRequest", async (request) => {
      const headers = request.headers;
      const tenant =
        (typeof headers["iq_tenant_id"] === "string" && headers["iq_tenant_id"]) ||
        (typeof headers["x-tenant-id"] === "string" && headers["x-tenant-id"]) ||
        IPD_DEV_TENANT_ID;
      request.headers["iq_tenant_id"] = tenant;
      request.headers["x-tenant-id"] = tenant;
    });
    await api.register(tenantPlugin);
    await api.register(createRouter({ db, useMock: USE_MOCK_DATA }));
  }, { prefix: "/api/ipd/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Swagger UI: http://localhost:${PORT}/docs`);
}

main().catch((err) => {
  console.error("Failed to start ipd-svc:", err);
  process.exit(1);
});
