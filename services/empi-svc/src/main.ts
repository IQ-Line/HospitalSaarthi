import Fastify from "fastify";
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
import { createTenantNumericCodeResolver } from "./tenant-numeric-code.js";

const PORT = Number(process.env["PORT"] ?? 3002);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";

async function main() {
  const app = Fastify({ logger: true });

  const db = createDb(DATABASE_URL);
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const patientRepo = new DrizzlePatientRepo(db);
  const addressRepo = new DrizzleAddressRepo(db);
  const identifierRepo = new DrizzleIdentifierRepo(db);
  const sequenceRepo = new DrizzleSequenceRepo(db);
  const sourceRecordRepo = new DrizzleSourceRecordRepo(db);
  const getTenantNumericCode = await createTenantNumericCodeResolver(db);

  app.get("/healthz", async () => ({ status: "ok" }));

  // NOTE: Fastify's prefix option wasn't applying reliably when registering the
  // exported module router plugin directly under tsx watch. Wrap it in an
  // intermediate plugin so the prefix is guaranteed.
  await app.register(
    async (v1) => {
      await v1.register(
        createRouter({
          patientRepo,
          addressRepo,
          identifierRepo,
          sequenceRepo,
          sourceRecordRepo,
          eventBus,
          getTenantNumericCode,
        }),
      );
    },
    { prefix: "/api/empi/v1" },
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start empi-svc:", err);
  process.exit(1);
});
