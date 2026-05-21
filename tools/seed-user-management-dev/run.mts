#!/usr/bin/env node
/**
 * Optional dev seed — platform bootstrap (capabilities + super-admin) + Cerbos checks.
 * Prefer: `npx nx run master-data:db-migrate` → `npx nx run user-management:db-migrate` → `pnpm seed`.
 * Schema-only migrate: `npx nx run user-management:db-migrate`. Bootstrap only: `npx nx run user-management:seed-platform`.
 */
const { loadWorkspaceEnv, normalizePostgresUrl, requireEnv } = await import("./load-env.ts");

loadWorkspaceEnv();

const { applyPlatformDataBootstrap } = await import(
  "../../modules/user-management/src/dev/platform-data-bootstrap.ts"
);
const { DEVELOPMENT_PLATFORM_OPERATOR } = await import("../../packages/dev-bootstrap/src/index.ts");
const { validateCerbosForBootstrapUser } = await import("./validate-cerbos.ts");
const { createDb } = await import("../../packages/ts-sdk-db/src/index.ts");
const { DrizzleUserRepository } = await import(
  "../../modules/user-management/src/data-access/user-repository.ts"
);
const { DrizzlePrincipalRoleProjectionRepository } = await import(
  "../../modules/user-management/src/data-access/drizzle-principal-role-projection-repository.ts"
);
const { DrizzlePrincipalAuthorizationRepository } = await import(
  "../../modules/user-management/src/data-access/principal-authorization-repository.ts"
);
const { createDefaultPrincipalService } = await import(
  "../../modules/user-management/src/services/default-principal-service.ts"
);

const databaseUrl = requireEnv("DATABASE_URL");
const masterDataDatabaseUrl = requireEnv("MASTER_DATA_DATABASE_URL");
const cerbosUrl = requireEnv("CERBOS_URL");
const secret = requireEnv("BETTER_AUTH_SECRET");
if (secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
}

const authBaseUrl = (process.env.AUTH_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const bootstrap = await applyPlatformDataBootstrap({
  databaseUrl,
  masterDataDatabaseUrl,
  auth: {
    authBaseUrl,
    secret,
    jwtIssuer: process.env.JWT_ISSUER?.trim() || authBaseUrl,
    jwtAudience: process.env.JWT_AUDIENCE?.trim() || "hims-platform",
  },
});

const db = createDb(normalizePostgresUrl(databaseUrl));
const principalService = createDefaultPrincipalService({
  userRepository: new DrizzleUserRepository(db),
  principalRoleProjectionRepository: new DrizzlePrincipalRoleProjectionRepository(db),
  principalAuthorizationRepository: new DrizzlePrincipalAuthorizationRepository(db),
});

const cerbos = await validateCerbosForBootstrapUser(cerbosUrl, principalService);
if (!cerbos.ok) {
  console.error(JSON.stringify({ level: "error", phase: "cerbos", checks: cerbos.checks }));
  process.exit(1);
}

console.log("[seed] platform bootstrap:", bootstrap);
console.log(
  `[seed] sign-in: ${DEVELOPMENT_PLATFORM_OPERATOR.email} / ${DEVELOPMENT_PLATFORM_OPERATOR.password}`,
);
console.log("[seed] cerbos: user.create, role.create, role.assign — OK");
