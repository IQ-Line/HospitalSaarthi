import "./load-env.js";
import path from "node:path";
import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb, sql } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import {
  ConfiguratorHttpIntegrationProfileRepo,
  createRouter,
  createPayloadEncryptorFromEnv,
  DrizzleAbdmSessionsRepo,
  DrizzleConsentArtefactsRepo,
  DrizzleInboundMessagesRepo,
  DrizzleLinkTokensRepo,
  createFideliusEncryptorFromEnv,
  HttpEmpiClient,
  HttpRegistrationClient,
  HttpRecordFoundationClient,
  MockEmpiClient,
  MockRecordFoundationClient,
  NoOpEmpiClient,
  NoOpRegistrationClient,
  NoOpRecordFoundationClient,
  registerM2CallbackRoutes,
  registerM3CallbackRoutes,
  registerScanShareCallbackRoutes,
  registerM2EventConsumers,
  createHipDataPushClientFromEnv,
  DrizzleLinkOtpsRepo,
  DrizzleCareContextLinkStateRepo,
  DrizzleM3ConsentRequestsRepo,
  DrizzleM3ConsentArtefactsHiuRepo,
  DrizzleM3DataTransfersRepo,
  scheduleIntegrationHubJanitor,
  allowInsecureAbdmCallbacks,
  nodeEnv,
  requireCallbackSecurityInProd,
  requireSessionTokenCryptoInProd,
  INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES,
  type IntegrationHubSharedInfra,
} from "@hims/integration-hub";
import {
  normalizeIntegrationHubEnvAliases,
  resolveDatabaseUrlFromEnv,
  serviceRoot,
} from "./load-env.js";
import { identityPlugin, validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerHttpErrorHandler } from "./http-errors.js";

normalizeIntegrationHubEnvAliases();
requireSessionTokenCryptoInProd();
requireCallbackSecurityInProd();

const PORT = Number(
  process.env["INTEGRATION_HUB_SVC_PORT"] ?? process.env["ABDM_ADAPTER_SVC_PORT"] ?? 3007,
);
const DATABASE_URL = resolveDatabaseUrlFromEnv();

const GATEWAY_BASE_URL =
  process.env["INTEGRATION_HUB_ABDM_GATEWAY_BASE_URL"] ??
  process.env["ABDM_GATEWAY_BASE_URL"] ??
  "https://dev.abdm.gov.in";
const ABHA_API_BASE_URL =
  process.env["INTEGRATION_HUB_ABDM_ABHA_API_BASE_URL"] ??
  process.env["ABDM_ABHA_API_BASE_URL"] ??
  "https://abhasbx.abdm.gov.in/abha/api";
const EMPI_BASE_URL = process.env["EMPI_BASE_URL"] ?? process.env["EMPI_URL"] ?? "";
const REGISTRATION_BASE_URL =
  process.env["REGISTRATION_BASE_URL"] ?? process.env["REGISTRATION_URL"] ?? "";
const ABDM_MOCK_PATIENT_ID =
  process.env["INTEGRATION_HUB_ABDM_MOCK_PATIENT_ID"]?.trim() ||
  process.env["ABDM_MOCK_PATIENT_ID"]?.trim() ||
  "00000000-0000-4000-8000-000000000001";
const RECORD_FOUNDATION_BASE_URL = process.env["RECORD_FOUNDATION_BASE_URL"] ?? "";
const ABDM_M2_MOCK_PLATFORM =
  (process.env["INTEGRATION_HUB_ABDM_M2_MOCK_PLATFORM"] ??
    process.env["ABDM_M2_MOCK_PLATFORM"]) === "true";
const ABDM_MOCK_ABHA_ADDRESS =
  process.env["INTEGRATION_HUB_ABDM_MOCK_ABHA_ADDRESS"]?.trim() ||
  process.env["ABDM_MOCK_ABHA_ADDRESS"]?.trim() ||
  "test.user@sbx";

const repoRoot = path.resolve(serviceRoot, "../..");

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

type FastifyApp = ReturnType<typeof Fastify>;

function assertDatabaseUrl(databaseUrl: string): asserts databaseUrl is string {
  if (!databaseUrl) {
    throw new Error(
      "INTEGRATION_HUB_DATABASE_URL, ABDM_DATA_DATABASE_URL, or DATABASE_URL is required",
    );
  }
}

async function verifyDbConnection(app: FastifyApp, db: ReturnType<typeof createDb>): Promise<void> {
  try {
    await db.execute(sql`select 1`);
    app.log.info("Database connection verified");
  } catch (dbErr) {
    app.log.error(dbErr, "Database connection failed at startup");
    throw new Error(
      "Cannot connect to Postgres — check DATABASE_URL (Azure: add ?sslmode=require)",
      { cause: dbErr },
    );
  }
}

function warnIfConfiguratorKeyMissing(app: FastifyApp): void {
  const configuratorInternalApiKey = process.env["CONFIGURATOR_INTERNAL_API_KEY"]?.trim();
  if (!configuratorInternalApiKey && process.env["NODE_ENV"] === "production") {
    app.log.warn(
      "CONFIGURATOR_INTERNAL_API_KEY unset — configurator by-tenant/by-hip profile lookup may fail when configurator enforces internal key auth",
    );
  }
}

function createEmpiClient(): IntegrationHubSharedInfra["empi"] {
  if (ABDM_M2_MOCK_PLATFORM) return new MockEmpiClient(ABDM_MOCK_ABHA_ADDRESS, ABDM_MOCK_PATIENT_ID);
  if (EMPI_BASE_URL) return new HttpEmpiClient(EMPI_BASE_URL);
  return new NoOpEmpiClient();
}

function createRecordFoundationClient(): IntegrationHubSharedInfra["recordFoundation"] {
  if (ABDM_M2_MOCK_PLATFORM) return new MockRecordFoundationClient(ABDM_MOCK_ABHA_ADDRESS);
  if (RECORD_FOUNDATION_BASE_URL)
    return new HttpRecordFoundationClient(RECORD_FOUNDATION_BASE_URL);
  return new NoOpRecordFoundationClient();
}

async function main() {
  assertDatabaseUrl(DATABASE_URL);

  const app = Fastify({ logger: true, ajv: fastifyAjv });
  registerHttpErrorHandler(app);

  await registerOpenApiDocs(app, {
    serviceId: "integration-hub",
    title: "Integration Hub API (ABDM)",
    version: "1.0.0",
    description: "NHA gateway and M1 ABHA enrolment (multi-tenant).",
    apiPrefix: "/api/abdm/v1",
    staticSpec: {
      path: "specs/openapi/integration-hub.v1.yaml",
      baseDir: repoRoot,
    },
  });

  const healthzHandler = async () => ({ status: "ok" as const });
  app.get("/healthz", healthzHandler);
  app.get("/api/abdm/v1/healthz", healthzHandler);

  const db = createDb(DATABASE_URL);
  await verifyDbConnection(app, db);

  warnIfConfiguratorKeyMissing(app);

  const profiles = ConfiguratorHttpIntegrationProfileRepo.fromEnv();
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const sessions = new DrizzleAbdmSessionsRepo(db, eventBus);
  const fidelius = createFideliusEncryptorFromEnv();
  const inboundMessages = new DrizzleInboundMessagesRepo(db);
  const linkTokens = new DrizzleLinkTokensRepo(db);
  const consentArtefacts = new DrizzleConsentArtefactsRepo(db);
  const empi = createEmpiClient();
  const registration = REGISTRATION_BASE_URL
    ? new HttpRegistrationClient(REGISTRATION_BASE_URL)
    : new NoOpRegistrationClient();
  const recordFoundation = createRecordFoundationClient();
  if (ABDM_M2_MOCK_PLATFORM) {
    app.log.warn(
      "ABDM_M2_MOCK_PLATFORM=true — EMPI/Record Foundation use in-memory mocks",
    );
  }
  const payloadEncryptor = createPayloadEncryptorFromEnv();
  const dataPush = createHipDataPushClientFromEnv();
  const m3ConsentRequests = new DrizzleM3ConsentRequestsRepo(db);
  const m3ConsentArtefactsHiu = new DrizzleM3ConsentArtefactsHiuRepo(db);
  const m3DataTransfers = new DrizzleM3DataTransfersRepo(db);
  const linkOtpStore = new DrizzleLinkOtpsRepo(db);
  const careContextLinkState = new DrizzleCareContextLinkStateRepo(db);

  const sharedInfra: IntegrationHubSharedInfra = {
    profiles,
    deployment: {
      gatewayBaseUrl: GATEWAY_BASE_URL,
      abhaApiBaseUrl: ABHA_API_BASE_URL,
    },
    db,
    sessions,
    inboundMessages,
    linkTokens,
    consentArtefacts,
    m3ConsentRequests,
    m3ConsentArtefactsHiu,
    m3DataTransfers,
    empi,
    registration,
    recordFoundation,
    careContextLinkState,
    fidelius,
    payloadEncryptor,
    linkOtpStore,
    dataPush,
    eventBus,
  };

  await registerM2EventConsumers(eventBus, sharedInfra);

  app.log.info(
    {
      nodeEnv: nodeEnv(),
      allowInsecureCallbacks: allowInsecureAbdmCallbacks(),
      m3MockGateway:
        (process.env["INTEGRATION_HUB_ABDM_M3_MOCK_GATEWAY"] ??
          process.env["ABDM_M3_MOCK_GATEWAY"]) === "true",
      m3LoopbackHiu:
        (process.env["INTEGRATION_HUB_ABDM_M3_LOOPBACK_HIU"] ??
          process.env["ABDM_M3_LOOPBACK_HIU"]) === "true",
      m3DevInboundSimulation:
        (process.env["INTEGRATION_HUB_ABDM_DEV_INBOUND_SIMULATION"] ??
          process.env["ABDM_DEV_INBOUND_SIMULATION"]) === "true",
      m3PublicBaseUrl:
        process.env["ABDM_ADAPTER_PUBLIC_BASE_URL"] ??
        process.env["INTEGRATION_HUB_PUBLIC_BASE_URL"] ??
        "(localhost default)",
    },
    "ABDM /api/v3 callback security",
  );

  await app.register(async (v3) => {
    await registerM2CallbackRoutes(v3, sharedInfra);
    await registerM3CallbackRoutes(v3, sharedInfra);
    await registerScanShareCallbackRoutes(v3, sharedInfra);
  }, { prefix: "/api/v3" });

  const abdmRouter = createRouter(sharedInfra);

  // Identity is ALWAYS on. validateAuthConfig() throws if JWKS_URL/JWT_ISSUER/JWT_AUDIENCE
  // are unset — a service terminating ABHA (M1) and consent (M3) APIs must never boot
  // without JWT verification. There is no opt-out flag.
  const identityAuth = validateAuthConfig();

  await app.register(async (api) => {
    await api.register(tenantPlugin);

    await api.register(async (scopedApp) => {
      // Platform JWT gate on /api/abdm/v1. NHA gateway callbacks live on the /api/v3
      // scope (registered above, OUTSIDE this plugin) and authenticate via gateway
      // signatures/session semantics, not our JWT. skipPathPrefixes exempts only health +
      // docs; every platform-facing route (M1/M2/M3/scan-share/bridge discovery) requires
      // a verified token.
      await scopedApp.register(identityPlugin, {
        ...identityAuth,
        skipPathPrefixes: [...INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES, "/docs"],
      });
      await scopedApp.register(abdmRouter);
    }, { prefix: "/abdm/v1" });
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });

  const janitorIntervalMs = Number(
    process.env["INTEGRATION_HUB_JANITOR_INTERVAL_MS"] ??
      process.env["ABDM_JANITOR_INTERVAL_MS"] ??
      300_000,
  );
  const janitorTimer = scheduleIntegrationHubJanitor({
    sharedInfra,
    log: app.log,
    intervalMs: janitorIntervalMs,
  });
  if (janitorTimer) {
    app.log.info({ janitorIntervalMs }, "integration hub janitor scheduled");
  }
}

main().catch((err) => {
  console.error("Failed to start integration-hub-svc:", err);
  process.exit(1);
});
