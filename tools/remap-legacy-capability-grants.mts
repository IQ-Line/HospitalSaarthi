#!/usr/bin/env node
/**
 * Remap `user_capabilities` / `role_capabilities` from legacy `um:*` keys to catalog slug keys.
 * Run after `pnpm sync:capabilities` when upgrading an existing dev database.
 */
import { createDb } from "../packages/ts-sdk-db/src/index.ts";
import { remapLegacyCapabilityGrants } from "../modules/user-management/src/dev/remap-legacy-capability-grants.ts";

const { loadWorkspaceEnv, normalizePostgresUrl, requireEnv } = await import(
  "./seed-user-management-dev/load-env.ts"
);

async function main(): Promise<void> {
  loadWorkspaceEnv();
  const databaseUrl = requireEnv("DATABASE_URL");
  const db = createDb(normalizePostgresUrl(databaseUrl));
  const result = await remapLegacyCapabilityGrants(db);
  console.log(JSON.stringify({ level: "info", phase: "remap-legacy-grants", ...result }, null, 2));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ level: "error", phase: "remap-legacy-grants", message }));
  process.exit(1);
});
