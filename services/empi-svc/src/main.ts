import Fastify from "fastify";
import { validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { registerAuthzStack } from "@hims/ts-sdk-authz";
import { createDefaultPrincipalDeps, principalRoleEnricherPlugin } from "@hims/user-management";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import {
  createRouter,
  DrizzlePatientRepo,
  DrizzleAddressRepo,
  DrizzleIdentifierRepo,
  DrizzleSequenceRepo,
  DrizzleSourceRecordRepo,
} from "@hims/empi";
import { createTenantNumericCodeLookup } from "./tenant-numeric-code.js";

const PORT = Number(
  process.env["EMPI_PORT"] ?? process.env["EMPI_SVC_PORT"] ?? 3002,
);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const CERBOS_URL = process.env["CERBOS_URL"];

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

  const db = createDb(DATABASE_URL);
  const getTenantNumericCode = createTenantNumericCodeLookup(db);
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const patientRepo = new DrizzlePatientRepo(db);
  const addressRepo = new DrizzleAddressRepo(db);
  const identifierRepo = new DrizzleIdentifierRepo(db);
  const sequenceRepo = new DrizzleSequenceRepo(db);
  const sourceRecordRepo = new DrizzleSourceRecordRepo(db);

  const empiRouter = createRouter({
    patientRepo,
    addressRepo,
    identifierRepo,
    sequenceRepo,
    sourceRecordRepo,
    eventBus,
    getTenantNumericCode,
  });

  const { userRepository, principalService } = createDefaultPrincipalDeps(db);

  if (!CERBOS_URL) {
    throw new Error("CERBOS_URL environment variable is required");
  }

  await app.register(async (api) => {
    await registerAuthzStack(api, {
      cerbosUrl: CERBOS_URL,
      identityPlugin: (await import("@hims/ts-sdk-identity")).identityPlugin,
      identityAuth: validateAuthConfig(),
      principalEnrichmentPlugin: principalRoleEnricherPlugin,
      principalEnrichmentOptions: { principalService, userRepository },
      skipAuthPrefixes: ["/docs"],
    });
    await api.register(tenantPlugin);

    await api.register(async (scopedApp) => {
      await scopedApp.register(empiRouter);
    }, { prefix: "/empi/v1" });
  }, { prefix: "/api" });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start empi-svc:", err);
  process.exit(1);
});
