import Fastify from "fastify";
import { validateAuthConfig } from "@hims/ts-sdk-identity";
import { registerOpenApiDocs } from "@hims/ts-sdk-openapi";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import { allocateIdentifier } from "@hims/ts-sdk-sequence";
import {
  createRouter,
  DrizzlePatientRepo,
  DrizzleAddressRepo,
  DrizzleIdentifierRepo,
  DrizzleSourceRecordRepo,
} from "@hims/empi";

const PORT = Number(
  process.env["EMPI_PORT"] ?? process.env["EMPI_SVC_PORT"] ?? 3002,
);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const ENABLE_AUTH = process.env["ENABLE_AUTH"] === "true";

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

  await app.register(async (api) => {
    if (ENABLE_AUTH) {
      const { identityPlugin } = await import("@hims/ts-sdk-identity");
      await api.register(identityPlugin, validateAuthConfig());
      await api.register(tenantPlugin, { tenantSource: "jwt" });
    } else {
      await api.register(tenantPlugin, { tenantSource: "header-or-jwt" });
    }

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
