#!/usr/bin/env node
/**
 * Idempotent seed: pharmacist login for configurator tenant ``demo tenant`` (slug ``dnt``).
 *
 *   pnpm seed:demo-tenant-pharmacist
 */
const { loadWorkspaceEnv, normalizePostgresUrl, requireEnv } = await import("./load-env.ts");

loadWorkspaceEnv();

const { createDb } = await import("../../packages/ts-sdk-db/src/index.ts");
const { DrizzleUserRepository } = await import(
  "../../modules/user-management/src/data-access/user-repository.ts"
);
const { DrizzlePrincipalRoleProjectionRepository } = await import(
  "../../modules/user-management/src/data-access/drizzle-principal-role-projection-repository.ts"
);
const {
  DEMO_TENANT_ID,
  DEMO_TENANT_ORG_ID,
  DEMO_TENANT_PHARMACIST,
} = await import("../../packages/dev-bootstrap/src/index.ts");
const { createDevSeedAuth, repairJwksForDevSeed } = await import("./create-dev-auth.ts");
const {
  loadActiveCapabilityRows,
  resolveCapabilityRows,
  seedTenantUser,
} = await import("./seed-development-users.ts");

const databaseUrl = requireEnv("DATABASE_URL");
const secret = requireEnv("BETTER_AUTH_SECRET");
if (secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
}

const authBaseUrl = (process.env.AUTH_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const db = createDb(normalizePostgresUrl(databaseUrl));

await repairJwksForDevSeed(db, secret);

const auth = createDevSeedAuth(
  db,
  {
    authBaseUrl,
    secret,
    jwtIssuer: process.env.JWT_ISSUER?.trim() || authBaseUrl,
    jwtAudience: process.env.JWT_AUDIENCE?.trim() || "hims-platform",
  },
  {
    userRepository: new DrizzleUserRepository(db),
    principalRoleProjectionRepository: new DrizzlePrincipalRoleProjectionRepository(db),
  },
);

const capabilityRows = await loadActiveCapabilityRows(db);

await seedTenantUser(
  db,
  auth as never,
  { tenantId: DEMO_TENANT_ID, orgId: DEMO_TENANT_ORG_ID },
  DEMO_TENANT_PHARMACIST,
  capabilityRows,
);

await resolveCapabilityRows(db, [
  "pharmacy:shell:access",
  "dispense:dispense:read",
  "dispense:dispense:update",
]);

console.log("[seed] demo tenant pharmacist ready");
console.log(`[seed] tenant: demo tenant (${DEMO_TENANT_ID})`);
console.log(
  `[seed] sign-in: ${DEMO_TENANT_PHARMACIST.email} / ${DEMO_TENANT_PHARMACIST.password}`,
);
