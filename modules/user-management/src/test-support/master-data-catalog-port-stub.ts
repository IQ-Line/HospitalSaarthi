import { masterDataSourcePairKey } from "../domain/master-data-source-pair.js";
import { normalizeModuleSlug } from "../domain/module-slug.js";
import type { MasterDataModuleCatalogPort } from "../ports/module-integration-ports.js";

/** Generic permission slugs used in tests and catalog seeds. */
const PERMISSIVE_PERMISSION_SLUGS = [
  "read",
  "create",
  "edit",
  "delete",
  "update",
  "manage",
  "access",
  "assign",
  "shell.access",
  "visit.read",
  "visit.create",
  "users.read",
  "patient.read",
] as const;

/**
 * Platform L1 → L2 descendant slugs, mirroring the Master Data catalog tree seeded by
 * `modules/master-data/alembic/versions/027_core_modules_catalog.py`
 * (`_USER_MANAGEMENT_L2_SEEDS`, `_CONFIGURATOR_L2_SEEDS`). Real Master Data
 * `expandEnabledModuleSlugs` walks this hierarchy; the stub mirrors it so canonical L2
 * capability rows (e.g. `module: "users"`) are assignable exactly as in production.
 */
const PLATFORM_L1_TO_L2_DESCENDANTS: Readonly<Record<string, readonly string[]>> = {
  "user-management": ["users", "user-roles", "role-capabilities", "user-capabilities"],
  configurator: ["organizations", "tenant-modules", "tenants"],
};

export function permissiveModulePermissionSourcePairs(
  moduleSlugs: readonly string[],
): Set<string> {
  const pairs = new Set<string>();
  for (const rawSlug of moduleSlugs) {
    const moduleSlug = normalizeModuleSlug(rawSlug);
    for (const permissionSlug of PERMISSIVE_PERMISSION_SLUGS) {
      pairs.add(masterDataSourcePairKey(moduleSlug, permissionSlug));
    }
  }
  return pairs;
}

export function createMasterDataModuleCatalogPortStub(
  overrides: Partial<MasterDataModuleCatalogPort> = {},
): MasterDataModuleCatalogPort {
  return {
    async resolveModuleSlugsByIds() {
      return new Map();
    },
    async resolveModuleKindBySlugs() {
      return new Map();
    },
    async expandEnabledModuleSlugs(moduleSlugs) {
      // Mirror real Master Data: a platform L1 slug expands to itself plus its L2 children
      // (superset — input slugs are always retained). See PLATFORM_L1_TO_L2_DESCENDANTS.
      const expanded = new Set<string>();
      for (const rawSlug of moduleSlugs) {
        const moduleSlug = normalizeModuleSlug(rawSlug);
        expanded.add(moduleSlug);
        for (const child of PLATFORM_L1_TO_L2_DESCENDANTS[moduleSlug] ?? []) {
          expanded.add(child);
        }
      }
      return [...expanded];
    },
    async listActiveModulePermissionSourcePairs(moduleSlugs) {
      return permissiveModulePermissionSourcePairs(moduleSlugs);
    },
    ...overrides,
  };
}
