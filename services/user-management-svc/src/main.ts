import Fastify from "fastify";
import { identityPlugin } from "@hims/ts-sdk-identity";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb } from "@hims/ts-sdk-db";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import {
  createRouter,
  DrizzleUserRepo,
  DrizzleRoleRepo,
} from "@hims/user-management";

const PORT = Number(process.env["PORT"] ?? 3000);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const JWKS_URL = process.env["JWKS_URL"] ?? "http://localhost:3000/.well-known/jwks.json";

// TODO: The identityPlugin currently uses a hardcoded SKIP_PATHS set
// (healthz, readyz, livez). Auth routes (/auth/login, /auth/refresh) need to
// be unauthenticated. Options:
//   1. Extend identityPlugin to accept configurable skip paths (preferred)
//   2. Register auth routes in a separate Fastify encapsulation scope
// For now, auth handler endpoints will fail with 401 until this is resolved.
// This is acceptable because auth endpoints are placeholder stubs pending
// better-auth integration anyway.

async function main() {
  const app = Fastify({ logger: true });

  await app.register(identityPlugin, { jwksUrl: JWKS_URL });
  await app.register(tenantPlugin);

  const db = createDb(DATABASE_URL);
  const eventBus = new InProcessEventBus();
  await eventBus.connect();

  const userRepo = new DrizzleUserRepo(db);
  const roleRepo = new DrizzleRoleRepo(db);

  // SessionRepo is a placeholder until better-auth integration.
  // better-auth manages sessions directly; we pass a stub to satisfy the router contract.
  const sessionRepo = {
    create: async () => { throw new Error("SessionRepo.create not implemented — use better-auth"); },
    findByToken: async () => undefined,
    invalidate: async () => {},
  } as Parameters<typeof createRouter>[0]["sessionRepo"];

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(
    createRouter({ userRepo, roleRepo, sessionRepo, eventBus }),
    { prefix: "/api/user-management/v1" },
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start user-management-svc:", err);
  process.exit(1);
});
