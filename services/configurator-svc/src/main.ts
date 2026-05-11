import Fastify from "fastify";
import { identityPlugin } from "@hims/ts-sdk-identity";
import { tenantPlugin } from "@hims/ts-sdk-tenant";
import { createDb, type DbInstance } from "@hims/ts-sdk-db";
import {
  createRouter,
  DrizzleOrganizationRepo,
  DrizzleTenantRepo,
  type RunConfiguratorTransaction,
} from "@hims/configurator";

const PORT = Number(process.env["PORT"] ?? 3001);
const DATABASE_URL = process.env["DATABASE_URL"] ?? "";
const JWKS_URL = process.env["JWKS_URL"] ?? "http://localhost:3000/.well-known/jwks.json";
const JWT_ISSUER = process.env["JWT_ISSUER"] ?? "http://localhost:3001";
const JWT_AUDIENCE = process.env["JWT_AUDIENCE"] ?? "hims-platform";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(identityPlugin, {
    jwksUrl: JWKS_URL,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  await app.register(tenantPlugin);

  const db = createDb(DATABASE_URL);

  const organizationRepo = new DrizzleOrganizationRepo(db);
  const tenantRepo = new DrizzleTenantRepo(db);

  const runConfiguratorTransaction: RunConfiguratorTransaction = (fn) =>
    db.transaction(async (tx) =>
      fn({
        organizationRepo: new DrizzleOrganizationRepo(tx as DbInstance),
        tenantRepo: new DrizzleTenantRepo(tx as DbInstance),
      }),
    );

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(
    createRouter({
      organizationRepo,
      tenantRepo,
      runConfiguratorTransaction,
    }),
    { prefix: "/api/configurator/v1" },
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start configurator-svc:", err);
  process.exit(1);
});
