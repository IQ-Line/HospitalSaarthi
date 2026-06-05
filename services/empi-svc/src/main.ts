import Fastify, { type FastifyInstance } from "fastify";
import { assertCerbosReachable, authzPlugin } from "@hims/ts-sdk-authz";
import { identityPlugin, validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import { allocateIdentifier } from "@hims/ts-sdk-sequence";
import {
  DrizzleUserRepository,
  DrizzlePrincipalRoleProjectionRepository,
  DrizzlePrincipalAuthorizationRepository,
  createDefaultPrincipalService,
  principalRoleEnricherPlugin,
} from "@hims/user-management";
import {
  createRouter,
  DrizzlePatientRepo,
  DrizzleAddressRepo,
  DrizzleIdentifierRepo,
  DrizzleSourceRecordRepo,
  createEmpiAuthzTargetResolver,
} from "@hims/empi";

const PORT = Number(
  process.env["EMPI_PORT"] ?? process.env["EMPI_SVC_PORT"] ?? 3002,
);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";

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
    serviceId: "empi",
    title: "EMPI API",
    version: "1.0.0",
    description: "Enterprise Master Patient Index — patient registration and identity.",
    apiPrefix: "/api/empi/v1",
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for empi-svc");
  }

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

  if (!process.env["CERBOS_URL"] || process.env["CERBOS_URL"].trim() === "") {
    throw new Error("CERBOS_URL is required for authorization service");
  }
  const cerbosUrl = process.env["CERBOS_URL"].trim();
  await assertCerbosReachable(cerbosUrl);

  const userRepository = new DrizzleUserRepository(db);
  const principalRoleProjectionRepository = new DrizzlePrincipalRoleProjectionRepository(db);
  const principalAuthorizationRepository = new DrizzlePrincipalAuthorizationRepository(db);
  const principalService = createDefaultPrincipalService({
    userRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
  });

  async function registerEmpiApi(api: FastifyInstance): Promise<void> {
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
      resolveTarget: createEmpiAuthzTargetResolver(),
    });
    await api.register(tenantPlugin, { tenantSource: "jwt" });
    await api.register(empiRouter);
  }

  await app.register(registerEmpiApi, { prefix: "/api/empi/v1" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start empi-svc:", err);
  process.exit(1);
});
