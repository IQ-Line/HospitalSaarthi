import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import {
  applyRegistrationSchemaMigration,
  DrizzleRegistrationRepo,
  HttpEmpiGateway,
  registerRegistrationsHandler,
} from "@hims/registration";

const PORT = Number(process.env["REGISTRATION_SVC_PORT"] ?? 3006);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const EMPI_URL = process.env["EMPI_URL"] ?? "http://localhost:3002";

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

async function main() {
  const app = Fastify({ logger: true, ajv: fastifyAjv });

  await app.register(cors, {
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "iq_tenant_id", "x-tenant-id"],
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow: boolean | string) => void,
    ) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      try {
        const { hostname } = new URL(origin);
        if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
          cb(null, true);
          return;
        }
      } catch {
        cb(null, false);
        return;
      }
      const allowlist =
        process.env["REGISTRATION_CORS_ORIGINS"]?.split(",").map((s) => s.trim()).filter(Boolean) ??
        [];
      cb(null, allowlist.includes(origin));
    },
  });

  await registerOpenApiDocs(app, {
    serviceId: "registration",
    title: "Registration API",
    version: "1.0.0",
    description: "Encounter intake / registration desk — encounter rows referencing EMPI.",
    apiPrefix: "/api/registration/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for registration-svc");
  }

  if (process.env["REGISTRATION_SKIP_MIGRATE"] !== "true") {
    await applyRegistrationSchemaMigration(DATABASE_URL);
    app.log.info("Registration schema migration applied (or already up to date)");
  }

  const db = createDb(DATABASE_URL);
  const registrationRepo = new DrizzleRegistrationRepo(db);
  const empiGateway = new HttpEmpiGateway(EMPI_URL);

  const handlerDeps = {
    registrationRepo,
    empiGateway,
  };

  await app.register(async (api) => {
    await api.register(tenantPlugin);
    registerRegistrationsHandler(api, handlerDeps);
  }, { prefix: "/api/registration/v1" });

  /**
   * Some gateways strip the matched prefix and only forward `/registrations` (see BFF
   * @fastify/http-proxy). Keep the same handlers at root for those callers.
   */
  await app.register(async (api) => {
    await api.register(tenantPlugin);
    registerRegistrationsHandler(api, handlerDeps);
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start registration-svc:", err);
  process.exit(1);
});
