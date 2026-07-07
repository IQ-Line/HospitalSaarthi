import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createDb } from "@hims/ts-sdk-db";
import { InvalidCapabilityKeyError } from "../domain/errors.js";
import {
  mapMasterDataPermissionToRuntimeCapability,
  type MappedRuntimeCapability,
} from "../domain/map-master-data-permission.js";
import { capabilities } from "../schema/tables.js";

export type MasterDataModulePermissionRow = {
  module_slug: string;
  permission_slug: string;
  permission_action: string;
  permission_name: string;
};

export type SyncCapabilitiesFromMasterDataResult = {
  inserted: number;
  updated: number;
  deactivated: number;
  skipped: number;
  skippedSamples: string[];
};

function normalizePostgresUrl(url: string): string {
  return url.replace(/^postgresql\+psycopg:\/\//, "postgresql://");
}

function readPgRows<T extends Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function loadMasterDataModulePermissions(
  masterDataDatabaseUrl: string,
): Promise<MasterDataModulePermissionRow[]> {
  const db = createDb(normalizePostgresUrl(masterDataDatabaseUrl));
  const result = await db.execute(sql`
    SELECT
      m.slug AS module_slug,
      p.slug AS permission_slug,
      p.action AS permission_action,
      p.name AS permission_name
    FROM master_global.module_permissions mp
    INNER JOIN master_global.modules m ON m.id = mp.module_id
    INNER JOIN master_global.permissions p ON p.id = mp.permission_id
    WHERE NOT mp.is_deleted
      AND NOT m.is_deleted
      AND NOT p.is_deleted
      AND mp.is_active
      AND m.is_active
      AND p.is_active
    ORDER BY m.slug, p.slug
  `);

  return readPgRows<MasterDataModulePermissionRow>(result);
}

function mapRow(row: MasterDataModulePermissionRow): MappedRuntimeCapability {
  return mapMasterDataPermissionToRuntimeCapability({
    moduleSlug: row.module_slug,
    permissionSlug: row.permission_slug,
    catalogAction: row.permission_action,
    displayName: row.permission_name,
  });
}

function sourcePairKey(moduleSlug: string, permissionSlug: string): string {
  return `${moduleSlug}\0${permissionSlug}`;
}

function describeMappingError(error: unknown): string {
  if (error instanceof InvalidCapabilityKeyError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

type MappedCatalog = {
  capabilities: MappedRuntimeCapability[];
  syncedSourcePairs: Set<string>;
  skipped: number;
  skippedSamples: string[];
};

/**
 * Map Master Data rows to runtime capabilities, deduping by capability_key.
 * Rows whose mapping throws are skipped (with up to 20 sampled reasons).
 */
function mapCatalogRows(rows: MasterDataModulePermissionRow[]): MappedCatalog {
  const mappedByKey = new Map<string, MappedRuntimeCapability>();
  const syncedSourcePairs = new Set<string>();
  let skipped = 0;
  const skippedSamples: string[] = [];

  for (const row of rows) {
    try {
      const mapped = mapRow(row);
      mappedByKey.set(mapped.capability_key, mapped);
      syncedSourcePairs.add(
        sourcePairKey(mapped.source_module_slug, mapped.source_permission_slug),
      );
    } catch (error) {
      skipped += 1;
      if (skippedSamples.length < 20) {
        skippedSamples.push(
          `${row.module_slug}/${row.permission_slug}: ${describeMappingError(error)}`,
        );
      }
    }
  }

  return {
    capabilities: [...mappedByKey.values()],
    syncedSourcePairs,
    skipped,
    skippedSamples,
  };
}

/**
 * Upsert a single mapped capability, returning whether it already existed.
 * First re-keys any legacy seed row sharing (module, feature, action) under an
 * old capability_key, then inserts-or-updates by capability_key.
 */
async function upsertCapability(
  db: DbInstance,
  cap: MappedRuntimeCapability,
): Promise<{ existed: boolean }> {
  const description = `Synced from Master Data (${cap.source_module_slug}/${cap.source_permission_slug}).`;

  // Legacy seed rows may share (module, feature, action) under an old capability_key (e.g. um:*).
  await db
    .update(capabilities)
    .set({
      capability_key: cap.capability_key,
      module: cap.module,
      feature: cap.feature,
      action: cap.action,
      display_name: cap.display_name,
      description,
      is_active: true,
      source_module_slug: cap.source_module_slug,
      source_permission_slug: cap.source_permission_slug,
      source_catalog: "master_data",
      updated_at: new Date(),
    })
    .where(
      and(
        eq(capabilities.module, cap.module),
        eq(capabilities.feature, cap.feature),
        eq(capabilities.action, cap.action),
        ne(capabilities.capability_key, cap.capability_key),
      ),
    );

  const [existing] = await db
    .select({ id: capabilities.id })
    .from(capabilities)
    .where(eq(capabilities.capability_key, cap.capability_key))
    .limit(1);

  await db
    .insert(capabilities)
    .values({
      capability_key: cap.capability_key,
      module: cap.module,
      feature: cap.feature,
      action: cap.action,
      display_name: cap.display_name,
      description,
      is_active: true,
      source_module_slug: cap.source_module_slug,
      source_permission_slug: cap.source_permission_slug,
      source_catalog: "master_data",
    })
    .onConflictDoUpdate({
      target: [capabilities.capability_key],
      set: {
        module: cap.module,
        feature: cap.feature,
        action: cap.action,
        display_name: cap.display_name,
        description,
        is_active: true,
        source_module_slug: cap.source_module_slug,
        source_permission_slug: cap.source_permission_slug,
        source_catalog: "master_data",
        updated_at: new Date(),
      },
    });

  return { existed: Boolean(existing) };
}

/**
 * Deactivate active master_data-sourced capabilities whose source pair is no
 * longer present in the catalog (or whose source columns are missing).
 * Returns the count deactivated.
 */
async function deactivateOrphans(
  db: DbInstance,
  syncedSourcePairs: Set<string>,
): Promise<number> {
  const mdCapabilities = await db
    .select({
      id: capabilities.id,
      source_module_slug: capabilities.source_module_slug,
      source_permission_slug: capabilities.source_permission_slug,
    })
    .from(capabilities)
    .where(
      and(
        eq(capabilities.source_catalog, "master_data"),
        eq(capabilities.is_active, true),
      ),
    );

  const orphanIds = mdCapabilities
    .filter((row) => {
      if (!row.source_module_slug || !row.source_permission_slug) {
        return true;
      }
      return !syncedSourcePairs.has(
        sourcePairKey(row.source_module_slug, row.source_permission_slug),
      );
    })
    .map((row) => row.id);

  if (orphanIds.length === 0) {
    return 0;
  }

  await db
    .update(capabilities)
    .set({ is_active: false, updated_at: new Date() })
    .where(inArray(capabilities.id, orphanIds));

  return orphanIds.length;
}

/**
 * One-way sync: Master Data `module_permissions` → User Management `capabilities`.
 * Master Data is the catalog source of truth; UM rows are deactivated when MD drops a link.
 */
export async function syncCapabilitiesFromMasterDataCatalog(
  userManagementDb: DbInstance,
  masterDataDatabaseUrl: string,
): Promise<SyncCapabilitiesFromMasterDataResult> {
  const rows = await loadMasterDataModulePermissions(masterDataDatabaseUrl);
  const { capabilities: mapped, syncedSourcePairs, skipped, skippedSamples } =
    mapCatalogRows(rows);

  let inserted = 0;
  let updated = 0;
  for (const cap of mapped) {
    const { existed } = await upsertCapability(userManagementDb, cap);
    if (existed) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  const deactivated = await deactivateOrphans(userManagementDb, syncedSourcePairs);

  return { inserted, updated, deactivated, skipped, skippedSamples };
}
