#!/usr/bin/env node
/**
 * Remove abbreviated-prefix capability rows (`um:`, `md:`, `cfg:`, `fd:`) from
 * `user_management.capabilities` and dependent grant tables.
 *
 * After purge, re-sync from Master Data and re-seed dev grants:
 *   pnpm sync:capabilities
 *   pnpm seed:user-management-dev
 */
import { createDb } from "../packages/ts-sdk-db/src/index.ts";
import { removeLegacyCapabilitiesFromCatalog } from "../modules/user-management/src/dev/remove-legacy-capabilities.ts";

const { loadWorkspaceEnv, normalizePostgresUrl, requireEnv } = await import(
  "./seed-user-management-dev/load-env.ts"
);

function parseArgs(argv: string[]): { dryRun: boolean; prefixes?: string[] } {
  let dryRun = false;
  const prefixes: string[] = [];

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--prefix=")) {
      const value = arg.slice("--prefix=".length).trim();
      if (value.length > 0) {
        prefixes.push(value.endsWith(":") ? value : `${value}:`);
      }
    }
  }

  return {
    dryRun,
    prefixes: prefixes.length > 0 ? prefixes : undefined,
  };
}

async function main(): Promise<void> {
  loadWorkspaceEnv();
  const { dryRun, prefixes } = parseArgs(process.argv.slice(2));

  const databaseUrl = requireEnv("DATABASE_URL");
  const db = createDb(normalizePostgresUrl(databaseUrl));

  const result = await removeLegacyCapabilitiesFromCatalog(db, { dryRun, prefixes });

  console.log(
    JSON.stringify(
      {
        level: "info",
        phase: "remove-legacy-capabilities",
        ...result,
        hint: dryRun
          ? "Re-run without --dry-run to delete, then pnpm sync:capabilities && pnpm seed:user-management-dev"
          : "Run pnpm sync:capabilities && pnpm seed:user-management-dev to repopulate catalog grants",
      },
      null,
      2,
    ),
  );

  if (result.matchedCapabilityKeys.length === 0) {
    console.log("[purge] no legacy capability keys found — nothing to do.");
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ level: "error", phase: "remove-legacy-capabilities", message }));
  process.exit(1);
});
