import "./load-env.js";
import path from "node:path";
import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb, sql } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import {
  createRouter,
  DrizzleAbdmSessionsRepo,
  EnvSecretsClient,
  FideliusEncryptorStub,
  HttpGatewayClient,
} from "@hims/abdm-adapter";
import {
  normalizeAbdmEnvAliases,
  resolveAbdmDatabaseUrlFromEnv,
  serviceRoot,
} from "./load-env.js";
import { registerHttpErrorHandler } from "./http-errors.js";

normalizeAbdmEnvAliases();

const PORT = Number(process.env["ABDM_ADAPTER_SVC_PORT"] ?? 3007);
const DATABASE_URL = resolveAbdmDatabaseUrlFromEnv();
const JWKS_URL =
  process.env["JWKS_URL"] ?? "http://localhost:3000/.well-known/jwks.json";
const ENABLE_AUTH = process.env["ENABLE_AUTH"] === "true";

const GATEWAY_BASE_URL =
  process.env["ABDM_GATEWAY_BASE_URL"] ?? "https://dev.abdm.gov.in";
const ABHA_API_BASE_URL =
  process.env["ABDM_ABHA_API_BASE_URL"] ??
  "https://abhasbx.abdm.gov.in/abha/api";
const ABDM_X_CM_ID = process.env["ABDM_X_CM_ID"] ?? "sbx";

const repoRoot = path.resolve(serviceRoot, "../..");

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

async function main() {
  if (!DATABASE_URL) {
    throw new Error(
      "ABDM_DATA_DATABASE_URL is required in services/abdm-adapter-svc/.env (postgresql://… or postgresql+psycopg://…)",
    );
  }

  const app = Fastify({ logger: true, ajv: fastifyAjv });
  registerHttpErrorHandler(app);

  await registerOpenApiDocs(app, {
    serviceId: "abdm-adapter",
    title: "ABDM Adapter API",
    version: "1.0.0",
    description: "NHA gateway and M1 ABHA enrolment.",
    apiPrefix: "/api/abdm/v1",
    staticSpec: {
      path: "specs/openapi/abdm-adapter.v1.yaml",
      baseDir: repoRoot,
    },
  });

  const healthzHandler = async () => ({ status: "ok" as const });
  app.get("/healthz", healthzHandler);
  app.get("/api/abdm/v1/healthz", healthzHandler);

  const db = createDb(DATABASE_URL);
  try {
    await db.execute(sql`select 1`);
    app.log.info("Database connection verified");
  } catch (dbErr) {
    app.log.error(dbErr, "Database connection failed at startup");
    throw new Error(
      "Cannot connect to Postgres — check ABDM_DATA_DATABASE_URL in services/abdm-adapter-svc/.env (Azure: add ?sslmode=require, URL-encode special characters in password)",
    );
  }

  const secrets = new EnvSecretsClient();
  const eventBus = new InProcessEventBus();
  await eventBus.connect();
  const sessions = new DrizzleAbdmSessionsRepo(db, eventBus);
  const gateway = new HttpGatewayClient({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    abhaApiBaseUrl: ABHA_API_BASE_URL,
    xCmId: ABDM_X_CM_ID,
    secrets,
  });
  const fidelius = new FideliusEncryptorStub();

  const abdmRouter = createRouter({
    sessions,
    gateway,
    fidelius,
    secrets,
  });

  await app.register(async (api) => {
    if (ENABLE_AUTH) {
      const { identityPlugin } = await import("@hims/ts-sdk-identity");
      await api.register(identityPlugin, { jwksUrl: JWKS_URL });
    }
    await api.register(tenantPlugin);

    await api.register(async (scopedApp) => {
      await scopedApp.register(abdmRouter);
    }, { prefix: "/abdm/v1" });
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start abdm-adapter-svc:", err);
  process.exit(1);
});
