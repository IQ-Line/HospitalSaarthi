import { createDb, sql } from "../../packages/ts-sdk-db/src/index.ts";
import { seedLog } from "./log.ts";
import { normalizePostgresUrl } from "./load-env.ts";

const GLOBAL_MASTER = "global_master";

function readPgRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

export type ResolvedMasterDataCatalog = {
  moduleIdsBySlug: Map<string, string>;
};

/**
 * Resolves active L1 module UUIDs from `global_master.modules` (Master Data catalog).
 * Used for Configurator `tenant_modules` seeding — no hardcoded slug list.
 */
export async function resolveMasterDataModuleCatalog(
  databaseUrl: string,
): Promise<ResolvedMasterDataCatalog> {
  const db = createDb(normalizePostgresUrl(databaseUrl));
  const moduleIdsBySlug = new Map<string, string>();

  const result = await db.execute(sql.raw(`
    SELECT slug, id::text AS id
    FROM ${GLOBAL_MASTER}.modules
    WHERE NOT is_deleted
      AND is_active
      AND level = 1
    ORDER BY slug
  `));

  for (const row of readPgRows(result)) {
    const slug = row.slug;
    const id = row.id;
    if (typeof slug === "string" && typeof id === "string" && id.length > 0) {
      moduleIdsBySlug.set(slug, id);
    }
  }

  if (moduleIdsBySlug.size === 0) {
    throw new Error(
      `No active L1 modules in ${GLOBAL_MASTER}.modules — run \`make db-migrate\` (master-data Alembic) first`,
    );
  }

  seedLog("master-data", "resolved catalog module ids from global_master", {
    modules: moduleIdsBySlug.size,
    slugs: [...moduleIdsBySlug.keys()],
  });

  return { moduleIdsBySlug };
}
