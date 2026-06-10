import "./load-env.js";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { identityPlugin, validateAuthConfig } from "@hims/ts-sdk-identity";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import { allocateIdentifier } from "@hims/ts-sdk-sequence";
import {
  DrizzleUserRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  DrizzleCapabilityRepository,
  createPepRuntimeAuthFromUrls,
  requirePepUpstreamBaseUrl,
  principalRoleEnricherPlugin,
} from "@hims/user-management";
import { HttpPdfPlatformRenderer } from "@hims/pdf-client";
import {
  applyRegistrationSchemaMigration,
  DrizzleRegistrationRepo,
  DrizzleVisitRepo,
  HttpBillingGateway,
  HttpEmpiGateway,
  HttpOpdGateway,
  HttpPicklistGateway,
  apiKeyAuthPlugin,
  createRegistrationAuthzTargetResolver,
  registerDocumentsHandler,
  registerInternalHandlers,
  registerRegistrationsHandler,
  registerVisitsHandler,
} from "@hims/registration";
import { DrizzleApiKeyValidator } from "./adapters/drizzle-api-key-validator.js";

const PORT = Number(process.env["REGISTRATION_SVC_PORT"] ?? 3006);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const EMPI_URL = process.env["EMPI_URL"] ?? "http://localhost:3002";
const BILLING_URL = process.env["BILLING_URL"] ?? "http://localhost:3003";
const OPD_URL = process.env["OPD_URL"] ?? "http://localhost:8020";
const MASTER_DATA_URL = process.env["MASTER_DATA_URL"] ?? "http://localhost:8010";
const PDF_PLATFORM_URL = process.env["PDF_PLATFORM_URL"] ?? "http://localhost:8091";
const PDF_PLATFORM_API_KEY = process.env["PDF_PLATFORM_API_KEY"];

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
      "x-api-key",
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
  const visitRepo = new DrizzleVisitRepo(db);
  const allocateOpVisitId = (tenantId: string) =>
    allocateIdentifier(db, { tenantId, identifierType: "op_visit" });
  const empiGateway = new HttpEmpiGateway(EMPI_URL, {
    warn: (detail, message) => app.log.warn(detail, message),
  });
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const billingReadPort = new HttpBillingGateway(BILLING_URL);
  const opdGateway = new HttpOpdGateway(OPD_URL, {
    warn: (detail, message) => app.log.warn(detail, message),
  });
  const picklistReadPort = new HttpPicklistGateway(
    MASTER_DATA_URL,
    (detail, message) => app.log.warn(detail, message),
  );
  const pdfRenderer = new HttpPdfPlatformRenderer({
    baseUrl: PDF_PLATFORM_URL,
    apiKey: PDF_PLATFORM_API_KEY,
  });
  app.log.info(
    {
      pdfPlatformUrl: PDF_PLATFORM_URL,
      reportWebOrigin: process.env["REPORT_WEB_ORIGIN"] ?? "http://localhost:5173",
    },
    "Registration PDF platform configured",
  );

  const handlerDeps = {
    registrationRepo,
    visitRepo,
    allocateOpVisitId,
    empiGateway,
    eventBus,
    opdGateway,
    picklistReadPort,
  };

  const documentDeps = {
    registrationRepo,
    visitRepo,
    billingReadPort,
    pdfRenderer,
    defaultReportWebOrigin: process.env["REPORT_WEB_ORIGIN"] ?? "http://localhost:5173",
    defaultReportLogoUrl: process.env["REPORT_LOGO_URL"] ?? "/reportLogo.svg",
  };

  const identityAuth = validateAuthConfig();

  if (!process.env["CERBOS_URL"] || process.env["CERBOS_URL"].trim() === "") {
    throw new Error("CERBOS_URL is required for authorization service");
  }
  const cerbosUrl = process.env["CERBOS_URL"].trim();
  await assertCerbosReachable(cerbosUrl);

  const userRepository = new DrizzleUserRepository(db);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(db);
  const principalAuthorizationRepository = new DrizzlePrincipalAuthorizationRepository(db);
  const capabilityRepository = new DrizzleCapabilityRepository(db);

  const configuratorUrl = requirePepUpstreamBaseUrl("CONFIGURATOR_URL");
  const masterDataUrl = requirePepUpstreamBaseUrl("MASTER_DATA_URL");

  const { principalService } = createPepRuntimeAuthFromUrls({
    configuratorUrl,
    masterDataUrl,
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
    capabilityRepository,
    log: (event, message) => app.log.info(event, message),
  });

  const apiKeyValidator = new DrizzleApiKeyValidator(db);

  async function registerRegistrationApi(api: FastifyInstance): Promise<void> {
    await api.register(apiKeyAuthPlugin, { validator: apiKeyValidator });
    await api.register(identityPlugin, {
      ...identityAuth,
      skipPathPrefixes: ["/docs"],
    });
    await api.register(principalRoleEnricherPlugin, {
      principalService,
      userRepository,
    });
    await api.register(authzPlugin, {
      cerbosUrl,
      resolveTarget: createRegistrationAuthzTargetResolver(),
    });
    await api.register(tenantPlugin);
    registerRegistrationsHandler(api, handlerDeps);
    registerVisitsHandler(api, {
      visitRepo,
      registrationRepo,
      allocateOpVisitId,
      eventBus,
      opdGateway,
    });
    registerDocumentsHandler(api, documentDeps);
  }

  await app.register(async (internalApi) => {
    await internalApi.register(tenantPlugin);
    registerInternalHandlers(internalApi, { registrationRepo });
  }, { prefix: "/api/registration/v1" });

  await app.register(registerRegistrationApi, { prefix: "/api/registration/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start registration-svc:", err);
  process.exit(1);
});
