import "./load-env.js";
import path from "node:path";
import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb, sql } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import {
  createRouter,
  createPayloadEncryptorFromEnv,
  DrizzleAbdmSessionsRepo,
  DrizzleConsentArtefactsRepo,
  DrizzleInboundMessagesRepo,
  DrizzleLinkTokensRepo,
  EnvSecretsClient,
  createFideliusEncryptorFromEnv,
  HttpEmpiClient,
  HttpGatewayClient,
  HttpRecordFoundationClient,
  MockEmpiClient,
  MockRecordFoundationClient,
  NoOpEmpiClient,
  NoOpRecordFoundationClient,
  registerM2CallbackRoutes,
  registerM2EventConsumers,
  HttpHipDataPushClient,
  LinkOtpStore,
  LoggingSmsClient,
  NoOpSmsClient,
} from "@hims/abdm-adapter";
import {
  normalizeAbdmEnvAliases,
  resolveDatabaseUrlFromEnv,
  serviceRoot,
} from "./load-env.js";
import { registerHttpErrorHandler } from "./http-errors.js";
import {
  requireCallbackSecurityInProd,
  requireSessionTokenCryptoInProd,
} from "@hims/abdm-adapter";

normalizeAbdmEnvAliases();
requireSessionTokenCryptoInProd();
requireCallbackSecurityInProd();

const PORT = Number(process.env["ABDM_ADAPTER_SVC_PORT"] ?? 3007);
const DATABASE_URL = resolveDatabaseUrlFromEnv();
const JWKS_URL =
  process.env["JWKS_URL"] ?? "http://localhost:3000/.well-known/jwks.json";
const ENABLE_AUTH = process.env["ENABLE_AUTH"] === "true";

const GATEWAY_BASE_URL =
  process.env["ABDM_GATEWAY_BASE_URL"] ?? "https://dev.abdm.gov.in";
const ABHA_API_BASE_URL =
  process.env["ABDM_ABHA_API_BASE_URL"] ??
  "https://abhasbx.abdm.gov.in/abha/api";
const ABDM_X_CM_ID = process.env["ABDM_X_CM_ID"] ?? "sbx";
const ABDM_X_HIP_ID = process.env["ABDM_X_HIP_ID"] ?? "";
const EMPI_BASE_URL = process.env["EMPI_BASE_URL"] ?? "";
const RECORD_FOUNDATION_BASE_URL = process.env["RECORD_FOUNDATION_BASE_URL"] ?? "";
const ABDM_M2_MOCK_PLATFORM = process.env["ABDM_M2_MOCK_PLATFORM"] === "true";
const ABDM_MOCK_ABHA_ADDRESS =
  process.env["ABDM_MOCK_ABHA_ADDRESS"]?.trim() || "test.user@sbx";
const ABDM_DEFAULT_SMS_PHONE = process.env["ABDM_DEFAULT_SMS_PHONE"]?.trim() ?? "";
const ABDM_HIP_DISPLAY_NAME = process.env["ABDM_HIP_DISPLAY_NAME"]?.trim() ?? "Hospital";

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
      "DATABASE_URL or ABDM_DATA_DATABASE_URL is required (postgresql://… or postgresql+psycopg://…)",
    );
  }

  const app = Fastify({ logger: true, ajv: fastifyAjv });
  registerHttpErrorHandler(app);

  if (!ENABLE_AUTH) {
    const nodeEnv = process.env["NODE_ENV"] ?? "development";
    if (nodeEnv === "production" || nodeEnv === "staging") {
      app.log.error(
        "ENABLE_AUTH is false — M1 routes are open to anyone with a tenant UUID. Set ENABLE_AUTH=true and JWKS_URL before staging/production.",
      );
    } else {
      app.log.warn(
        "ENABLE_AUTH is false — local dev only. M1 enrol/profile APIs trust x-tenant-id alone.",
      );
    }
  }

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
      "Cannot connect to Postgres — check DATABASE_URL (Azure: add ?sslmode=require, URL-encode special characters in password)",
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
  const fidelius = createFideliusEncryptorFromEnv();
  const inboundMessages = new DrizzleInboundMessagesRepo(db);
  const linkTokens = new DrizzleLinkTokensRepo(db);
  const consentArtefacts = new DrizzleConsentArtefactsRepo(db);
  const empi = ABDM_M2_MOCK_PLATFORM
    ? new MockEmpiClient(ABDM_MOCK_ABHA_ADDRESS)
    : EMPI_BASE_URL
      ? new HttpEmpiClient(EMPI_BASE_URL)
      : new NoOpEmpiClient();
  const recordFoundation = ABDM_M2_MOCK_PLATFORM
    ? new MockRecordFoundationClient()
    : RECORD_FOUNDATION_BASE_URL
      ? new HttpRecordFoundationClient(RECORD_FOUNDATION_BASE_URL)
      : new NoOpRecordFoundationClient();
  if (ABDM_M2_MOCK_PLATFORM) {
    app.log.warn(
      "ABDM_M2_MOCK_PLATFORM=true — EMPI/Record Foundation use in-memory mocks for user-initiated linking",
    );
  }
  const payloadEncryptor = createPayloadEncryptorFromEnv();
  const dataPush = new HttpHipDataPushClient();
  const linkOtpStore = new LinkOtpStore();
  const sms = ABDM_DEFAULT_SMS_PHONE
    ? new LoggingSmsClient()
    : new NoOpSmsClient();

  await registerM2EventConsumers(eventBus, {
    sessions,
    gateway,
    fidelius,
    secrets,
    inboundMessages,
    linkTokens,
    consentArtefacts,
    empi,
    recordFoundation,
    dataPush,
    payloadEncryptor,
    eventBus,
    xHipId: ABDM_X_HIP_ID,
    xCmId: ABDM_X_CM_ID,
    defaultSmsPhoneNo: ABDM_DEFAULT_SMS_PHONE || undefined,
    hipDisplayName: ABDM_HIP_DISPLAY_NAME,
    linkOtpStore,
    sms,
  });

  const adapterDeps = {
    sessions,
    gateway,
    fidelius,
    secrets,
    inboundMessages,
    linkTokens,
    consentArtefacts,
    empi,
    recordFoundation,
    dataPush,
    payloadEncryptor,
    eventBus,
    xHipId: ABDM_X_HIP_ID,
    xCmId: ABDM_X_CM_ID,
    defaultSmsPhoneNo: ABDM_DEFAULT_SMS_PHONE || undefined,
    hipDisplayName: ABDM_HIP_DISPLAY_NAME,
    linkOtpStore,
    sms,
  };

  await app.register(async (v3) => {
    await registerM2CallbackRoutes(v3, adapterDeps);
  }, { prefix: "/api/v3" });

  const abdmRouter = createRouter(adapterDeps);

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
