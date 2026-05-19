import { createDb, sql } from "../../packages/ts-sdk-db/src/index.ts";
import { DEMO_CATALOG_MODULE_SLUGS } from "./constants.ts";
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
 * Resolves demo module UUIDs from `global_master.modules` after Alembic migrations.
 * Does not insert catalog rows — see `030_demo_authorization_catalog` migration.
 */
export async function resolveMasterDataModuleCatalog(
  databaseUrl: string,
): Promise<ResolvedMasterDataCatalog> {
  const db = createDb(normalizePostgresUrl(databaseUrl));
  const moduleIdsBySlug = new Map<string, string>();
  const slugList = DEMO_CATALOG_MODULE_SLUGS.map((s) => `'${s}'`).join(", ");

  const result = await db.execute(sql.raw(`
    SELECT slug, id::text AS id
    FROM ${GLOBAL_MASTER}.modules
    WHERE slug IN (${slugList}) AND NOT is_deleted
  `));

  for (const row of readPgRows(result)) {
    const slug = row.slug;
    const id = row.id;
    if (typeof slug === "string" && typeof id === "string" && id.length > 0) {
      moduleIdsBySlug.set(slug, id);
    }
  }

  for (const slug of DEMO_CATALOG_MODULE_SLUGS) {
    if (!moduleIdsBySlug.has(slug)) {
      throw new Error(
        `Module slug "${slug}" not found in ${GLOBAL_MASTER}.modules — run \`make db-migrate\` (master-data Alembic) first`,
      );
    }
  }

  seedLog("master-data", "resolved catalog module ids from global_master", {
    modules: moduleIdsBySlug.size,
    slugs: [...moduleIdsBySlug.keys()],
  });

  return { moduleIdsBySlug };
}
