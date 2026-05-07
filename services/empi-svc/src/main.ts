import Fastify from "fastify";
import { identityPlugin } from "@hims/ts-sdk-identity";
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

const PORT = Number(process.env["PORT"] ?? 3002);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const JWKS_URL =
  process.env["JWKS_URL"] ?? "http://localhost:3000/.well-known/jwks.json";

// TODO: Replace with real tenant numeric code lookup from Configurator's tenants table.
// For now, returns a static 5-digit code for local development.
function getTenantNumericCode(_tenantId: string): string {
  return "00001";
}

async function main() {
  const app = Fastify({ logger: true });

  await app.register(identityPlugin, { jwksUrl: JWKS_URL });
  await app.register(tenantPlugin);

  const db = createDb(DATABASE_URL);
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const patientRepo = new DrizzlePatientRepo(db);
  const addressRepo = new DrizzleAddressRepo(db);
  const identifierRepo = new DrizzleIdentifierRepo(db);
  const sequenceRepo = new DrizzleSequenceRepo(db);
  const sourceRecordRepo = new DrizzleSourceRecordRepo(db);

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(
    createRouter({
      patientRepo,
      addressRepo,
      identifierRepo,
      sequenceRepo,
      sourceRecordRepo,
      eventBus,
      getTenantNumericCode,
    }),
    { prefix: "/api/empi/v1" },
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start empi-svc:", err);
  process.exit(1);
});
