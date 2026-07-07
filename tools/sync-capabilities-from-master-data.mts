#!/usr/bin/env node
/**
 * Sync User Management `capabilities` from Master Data `master_global.module_permissions`.
 */
import { createDb } from "../packages/ts-sdk-db/src/index.ts";
import { remapLegacyCapabilityGrants } from "../modules/user-management/src/dev/remap-legacy-capability-grants.ts";
import { syncCapabilitiesFromMasterDataCatalog } from "../modules/user-management/src/dev/sync-capabilities-from-master-data-catalog.ts";

const { loadWorkspaceEnv, normalizePostgresUrl, requireEnv } = await import(
  "./seed-user-management-dev/load-env.ts"
);

async function main(): Promise<void> {
  loadWorkspaceEnv();

  const databaseUrl = requireEnv("DATABASE_URL");
  const masterDataUrl = requireEnv("MASTER_DATA_DATABASE_URL");

  const db = createDb(normalizePostgresUrl(databaseUrl));
  const result = await syncCapabilitiesFromMasterDataCatalog(db, masterDataUrl);
  const remap = await remapLegacyCapabilityGrants(db);

  console.log(
    JSON.stringify({ level: "info", phase: "sync-capabilities", ...result, remap }, null, 2),
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ level: "error", phase: "sync-capabilities", message }));
  process.exit(1);
});
