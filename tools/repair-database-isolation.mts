#!/usr/bin/env node
/**
 * Ensures module databases are isolated:
 * - hims-user-management: user_management (+ auth) only — no configurator schema
 * - hims-configurator: configurator schema only — no user_management schema
 *
 * Usage: pnpm repair:db-isolation
 */
import {
  assertConfiguratorDatabaseIsolation,
  assertUserManagementDatabaseIsolation,
  createDb,
  sql,
} from "../packages/ts-sdk-db/src/index.ts";

const { loadWorkspaceEnv, requireEnv } = await import("./seed-user-management-dev/load-env.ts");

async function dropConfiguratorFromUserManagement(userMgmtUrl: string): Promise<void> {
  const db = createDb(userMgmtUrl);
  await db.execute(sql.raw("DROP SCHEMA IF EXISTS configurator CASCADE"));
  console.log("[repair] dropped configurator schema from user-management database (if present)");
}

async function main(): Promise<void> {
  loadWorkspaceEnv();

  const userMgmtUrl = requireEnv("USER_MGMT_DATABASE_URL");
  const configuratorUrl = requireEnv("CONFIGURATOR_DATABASE_URL");

  console.log("[repair] cleaning user-management database");
  await dropConfiguratorFromUserManagement(userMgmtUrl);

  console.log("[repair] verifying user-management database");
  const umDb = createDb(userMgmtUrl);
  await assertUserManagementDatabaseIsolation({ db: umDb, connectionString: userMgmtUrl });
  console.log("[repair] user-management OK");

  console.log("[repair] verifying configurator database");
  const cfgDb = createDb(configuratorUrl);
  await assertConfiguratorDatabaseIsolation({ db: cfgDb, connectionString: configuratorUrl });
  console.log("[repair] configurator OK");
  console.log("[repair] done — org/tenant data is only in hims-configurator; use CONFIGURATOR_URL HTTP API");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
