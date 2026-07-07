import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import { allocateIdentifier } from "@hims/ts-sdk-sequence";
import { validateAuthConfig, identityPlugin } from "@hims/ts-sdk-identity";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import {
  DrizzleUserRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  DrizzleCapabilityRepository,
  createPepRuntimeAuthFromUrls,
  requirePepUpstreamBaseUrl,
  principalRoleEnricherPlugin,
} from "@hims/user-management";
import {
  createRouter,
  createEmpiAuthzTargetResolver,
  DrizzlePatientRepo,
  DrizzleAddressRepo,
  DrizzleIdentifierRepo,
  DrizzleSourceRecordRepo,
} from "@hims/empi";

const PORT = Number(
  process.env["EMPI_PORT"] ?? process.env["EMPI_SVC_PORT"] ?? 3002,
);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const CERBOS_URL = process.env["CERBOS_URL"];
/** Dev-only fallback when Swagger/curl omit tenant headers. */
const EMPI_DEV_TENANT_ID =
  process.env["EMPI_DEV_TENANT_ID"] ?? "00000000-0000-0000-0000-000000000007";

const fastifyAjv = {
  customOptions: {
    removeAdditional: false as const,
    coerceTypes: true,
    useDefaults: true,
  },
};

function resolveRequestTenantId(headers: Record<string, unknown>): string {
  const fromHeader =
    (typeof headers["iq_tenant_id"] === "string" ? headers["iq_tenant_id"].trim() : "") ||
    (typeof headers["x-tenant-id"] === "string" ? headers["x-tenant-id"].trim() : "");
  if (fromHeader) return fromHeader.toLowerCase();
  if (process.env["NODE_ENV"] !== "production") return EMPI_DEV_TENANT_ID;
  return "";
}

async function main() {
  if (!CERBOS_URL) {
    throw new Error("CERBOS_URL environment variable is required");
  }
  if (!DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required for empi-svc");
  }

  const app = Fastify({ logger: true, ajv: fastifyAjv });

  await registerOpenApiDocs(app, {
    serviceId: "empi",
    title: "EMPI API",
    version: "1.0.0",
    description: "Enterprise Master Patient Index — patient registration and identity.",
    apiPrefix: "/api/empi/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  const db = createDb(DATABASE_URL);
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const allocatePatientUhid = (tenantId: string) =>
    allocateIdentifier(db, { tenantId, identifierType: "patient_uhid" });

  const empiRouter = createRouter({
    patientRepo: new DrizzlePatientRepo(db),
    addressRepo: new DrizzleAddressRepo(db),
    identifierRepo: new DrizzleIdentifierRepo(db),
    sourceRecordRepo: new DrizzleSourceRecordRepo(db),
    eventBus,
    allocatePatientUhid,
  });

  const identityAuth = validateAuthConfig();
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

  await assertCerbosReachable(CERBOS_URL);

  await app.register(async (api) => {
    api.addHook("onRequest", async (request) => {
      const tenant = resolveRequestTenantId(request.headers as Record<string, unknown>);
      request.headers["iq_tenant_id"] = tenant;
      request.headers["x-tenant-id"] = tenant;
    });
    await api.register(tenantPlugin);

    await api.register(identityPlugin, {
      ...identityAuth,
      skipPathPrefixes: ["/docs"],
    });
    await api.register(principalRoleEnricherPlugin, {
      principalService,
      userRepository,
    });
    await api.register(authzPlugin, {
      cerbosUrl: CERBOS_URL,
      resolveTarget: createEmpiAuthzTargetResolver(),
    });

    await api.register(empiRouter);
  }, { prefix: "/api/empi/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start empi-svc:", err);
  process.exit(1);
});
