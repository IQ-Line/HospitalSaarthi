#!/usr/bin/env node
/**
 * Optional dev seed — same bootstrap as `user-management:db-migrate` (capabilities + super-admin).
 * Prefer: `npx nx run master-data:db-migrate` then `npx nx run user-management:db-migrate`.
 */
import { resolveDatabaseUrl } from "../packages/ts-sdk-db/src/index.ts";
import { applyPlatformDataBootstrap } from "../modules/user-management/src/dev/platform-data-bootstrap.ts";
import { loadWorkspaceEnv, requireEnv } from "./seed-user-management-dev/load-env.ts";
import { DEVELOPMENT_PLATFORM_OPERATOR } from "../packages/dev-bootstrap/src/index.ts";
import { validateCerbosForBootstrapUser } from "./seed-user-management-dev/validate-cerbos.ts";
import { createDb } from "../packages/ts-sdk-db/src/index.ts";
import { DrizzleUserRepository } from "../modules/user-management/src/data-access/user-repository.ts";
import { DrizzlePrincipalRoleProjectionRepository } from "../modules/user-management/src/data-access/drizzle-principal-role-projection-repository.ts";
import { DrizzlePrincipalAuthorizationRepository } from "../modules/user-management/src/data-access/principal-authorization-repository.ts";
import { createDefaultPrincipalService } from "../modules/user-management/src/services/default-principal-service.ts";
import { normalizePostgresUrl } from "./seed-user-management-dev/load-env.ts";

loadWorkspaceEnv();

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
console.log(`[seed] sign-in: ${DEVELOPMENT_PLATFORM_OPERATOR.email} / ${DEVELOPMENT_PLATFORM_OPERATOR.password}`);
console.log("[seed] cerbos: user.create, role.create, role.assign — OK");
