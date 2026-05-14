import Fastify from "fastify";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
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

const PORT = Number(process.env["EMPI_SVC_PORT"] ?? 3002);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const JWKS_URL =
  process.env["JWKS_URL"] ?? "http://localhost:3000/.well-known/jwks.json";
const ENABLE_AUTH = process.env["ENABLE_AUTH"] === "true";

const fastifyAjv = {
  customOptions: {
    // Default Fastify Ajv uses removeAdditional: true, which strips unknown keys
    // instead of failing when additionalProperties: false — clients must get 400.
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

  await app.register(async (api) => {
    if (ENABLE_AUTH) {
      const { identityPlugin } = await import("@hims/ts-sdk-identity");
      await api.register(identityPlugin, { jwksUrl: JWKS_URL });
    }
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
