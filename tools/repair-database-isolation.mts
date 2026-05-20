#!/usr/bin/env node
/**
 * Verifies module schemas exist on the shared operational database (hims_dev).
 *
 * Usage: pnpm repair:db-isolation
 */
import {
  assertConfiguratorDatabaseIsolation,
  assertUserManagementDatabaseIsolation,
  createDb,
  resolveDatabaseUrl,
} from "../packages/ts-sdk-db/src/index.ts";

const { loadWorkspaceEnv } = await import("./seed-user-management-dev/load-env.ts");

async function main(): Promise<void> {
  loadWorkspaceEnv();

  const databaseUrl = resolveDatabaseUrl();
  console.log(`[repair] verifying schemas on ${parseDbName(databaseUrl)}`);

  const db = createDb(databaseUrl);
  await assertUserManagementDatabaseIsolation({ db, connectionString: databaseUrl });
  console.log("[repair] user_management schema OK");

  await assertConfiguratorDatabaseIsolation({ db, connectionString: databaseUrl });
  console.log("[repair] configurator schema OK");
  console.log("[repair] done");
}

function parseDbName(url: string): string {
  try {
    return new URL(url.replace(/^postgresql\+psycopg:\/\//, "postgresql://")).pathname.slice(1);
  } catch {
    return "(unknown)";
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
