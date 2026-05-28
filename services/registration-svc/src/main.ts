import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { identityPlugin, validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerAuthzStack } from "@hims/ts-sdk-authz";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import {
  createDefaultPrincipalDeps,
  principalRoleEnricherPlugin,
} from "@hims/user-management";
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
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "iq_tenant_id",
      "x-tenant-id",
      "Idempotency-Key",
    ],
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
  const empiGateway = new HttpEmpiGateway(EMPI_URL, {
    warn: (detail, message) => app.log.warn(detail, message),
  });
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const handlerDeps = {
    registrationRepo,
    empiGateway,
    eventBus,
  };

  if (!process.env["CERBOS_URL"] || process.env["CERBOS_URL"].trim() === "") {
    throw new Error("CERBOS_URL is required for authorization service");
  }
  const cerbosUrl = process.env["CERBOS_URL"].trim();

  const { userRepository, principalService } = createDefaultPrincipalDeps(db);

  async function registerRegistrationApi(api: FastifyInstance): Promise<void> {
    await registerAuthzStack(api, {
      cerbosUrl,
      identityPlugin,
      identityAuth: validateAuthConfig(),
      principalEnrichmentPlugin: principalRoleEnricherPlugin,
      principalEnrichmentOptions: { principalService, userRepository },
      skipAuthPrefixes: ["/docs"],
    });
    await api.register(tenantPlugin);
    registerRegistrationsHandler(api, handlerDeps);
  }

  await app.register(registerRegistrationApi, { prefix: "/api/registration/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start registration-svc:", err);
  process.exit(1);
});
