#!/usr/bin/env node
/**
 * Development runtime seed (Configurator tenant, UM capabilities, users, better-auth).
 *
 * Official entry: `make seed` (wraps this script).
 * Prerequisites: `make setup` or `make db-migrate` on hims-master, hims-configurator, hims-user-management.
 * Catalog data: Master Data Alembic only — not inserted here.
 */
import {
  assertConfiguratorDatabaseIsolation,
  assertUserManagementDatabaseIsolation,
  createDb,
  sql,
} from "../packages/ts-sdk-db/src/index.ts";

const { printSummary, seedError, seedLog } = await import("./seed-user-management-dev/log.ts");
const { loadWorkspaceEnv, normalizePostgresUrl, requireEnv } = await import(
  "./seed-user-management-dev/load-env.ts"
);
const { resolveMasterDataModuleCatalog } = await import(
  "./seed-user-management-dev/resolve-master-data-catalog.ts"
);
const { seedConfigurator } = await import("./seed-user-management-dev/seed-configurator.ts");
const umSeed = await import("./seed-user-management-dev/seed-user-management.ts");
const { validateCerbosForBootstrapUser } = await import(
  "./seed-user-management-dev/validate-cerbos.ts"
);
const { DEVELOPMENT_SEED_USERS } = await import("../packages/dev-bootstrap/src/index.ts");

function readPgRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

async function assertSchemaExists(databaseUrl: string, schema: string): Promise<void> {
  const db = createDb(normalizePostgresUrl(databaseUrl));
  const result = await db.execute(
    sql.raw(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = '${schema}'
      ) AS exists
    `),
  );
  const rows = readPgRows(result);
  const exists = rows[0]?.exists === true || rows[0]?.exists === "t";
  if (!exists) {
    seedError(
      "preflight",
      `Schema "${schema}" not found — run module migrations first`,
      { databaseUrl: databaseUrl.replace(/:[^:@/]+@/, ":***@") },
    );
  }
}

async function main(): Promise<void> {
  loadWorkspaceEnv();

  const masterDataUrl = requireEnv("MASTER_DATA_DATABASE_URL");
  const configuratorUrl = requireEnv("CONFIGURATOR_DATABASE_URL");
  const userMgmtUrl = requireEnv("USER_MGMT_DATABASE_URL");
  const cerbosUrl = requireEnv("CERBOS_URL");
  const authBaseUrl = (process.env.AUTH_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const jwtIssuer = process.env.JWT_ISSUER?.trim() || authBaseUrl;
  const jwtAudience = process.env.JWT_AUDIENCE?.trim() || "hims-platform";
  const secret = requireEnv("BETTER_AUTH_SECRET");
  if (secret.length < 32) {
    seedError("preflight", "BETTER_AUTH_SECRET must be at least 32 characters");
  }

  seedLog("preflight", "checking database schemas");
  await assertSchemaExists(masterDataUrl, "global_master");
  await assertSchemaExists(configuratorUrl, "configurator");
  await assertSchemaExists(userMgmtUrl, "user_management");

  const umDb = createDb(userMgmtUrl);
  await assertUserManagementDatabaseIsolation({ db: umDb, connectionString: userMgmtUrl });
  const cfgDb = createDb(configuratorUrl);
  await assertConfiguratorDatabaseIsolation({ db: cfgDb, connectionString: configuratorUrl });

  seedLog("master-data", "resolving catalog module ids (Alembic-owned)");
  const md = await resolveMasterDataModuleCatalog(masterDataUrl);

  seedLog("configurator", "seeding tenant and modules");
  const cfg = await seedConfigurator(configuratorUrl, md.moduleIdsBySlug);

  seedLog("user-management", "seeding runtime data and auth");
  const um = await umSeed.seedUserManagement(userMgmtUrl, {
    authBaseUrl,
    secret,
    jwtIssuer,
    jwtAudience,
  });

  const umDbForPrincipal = createDb(normalizePostgresUrl(userMgmtUrl));
  const principalService = umSeed.buildPrincipalService(umDbForPrincipal);

  seedLog("cerbos", "validating authorization", { cerbosUrl });
  const cerbos = await validateCerbosForBootstrapUser(cerbosUrl, principalService);
  if (!cerbos.ok) {
    seedError("cerbos", "bootstrap user failed Cerbos checks", { checks: cerbos.checks });
  }

  printSummary({
    modules: md.moduleIdsBySlug.size,
    tenant_modules: cfg.tenant_modules,
    capabilities: um.capabilities,
    roles: um.roles,
    users: um.users,
  });
  console.log("[seed] development sign-in (better-auth — capabilities from GET /auth/principal):");
  for (const user of DEVELOPMENT_SEED_USERS) {
    console.log(`  - ${user.description}`);
    console.log(`    ${user.email} / ${user.password}`);
  }
  console.log("[seed] cerbos: user.create, role.create, role.assign — OK");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ level: "error", phase: "fatal", message }));
  process.exit(1);
});
