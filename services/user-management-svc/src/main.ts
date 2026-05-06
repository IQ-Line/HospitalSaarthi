import sensible from "@fastify/sensible";
import { createDb } from "@hims/ts-sdk-db";
import { createEventBus } from "@hims/ts-sdk-events";
import { identityPlugin } from "@hims/ts-sdk-identity";
import Fastify, { type FastifyInstance } from "fastify";
import {
  DrizzleRoleAssignmentRepository,
  DrizzleUserRepository,
  InMemoryRoleAssignmentRepository,
  InMemoryUserRepository,
  userManagementPlugin,
} from "@hims/user-management";

/**
 * Internal orchestration: Fastify instance, event bus lifecycle, persistence adapters, module plugin registration.
 * Not part of the service’s public contract — {@link main} is the sole runtime entrypoint.
 */
async function createApp(): Promise<FastifyInstance> {
  const app = Fastify();

  const eventBus = createEventBus({ type: "in-process" });
  await eventBus.connect();

  app.addHook("onClose", async () => {
    await eventBus.disconnect();
  });

  await app.register(sensible);

  await app.register(identityPlugin, {
    jwksUrl: process.env.JWKS_URL ?? "http://localhost:3001/.well-known/jwks.json",
  });

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const usePostgres = databaseUrl !== undefined && databaseUrl.length > 0;

  let userRepository;
  let roleAssignmentRepository;
  if (usePostgres) {
    const db = createDb(databaseUrl);
    userRepository = new DrizzleUserRepository(db);
    roleAssignmentRepository = new DrizzleRoleAssignmentRepository(db);
  } else {
    userRepository = new InMemoryUserRepository();
    roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  }

  await app.register(userManagementPlugin, {
    eventBus,
    userRepository,
    roleAssignmentRepository,
  });
  return app;
}

async function main(): Promise<void> {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`User Management service listening on http://localhost:${port}`);
}

await main();
