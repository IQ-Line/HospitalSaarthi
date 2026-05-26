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
  "shell.access",
  "visit.read",
  "visit.create",
  "users.read",
] as const;

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
      return moduleSlugs;
    },
    async listActiveModulePermissionSourcePairs(moduleSlugs) {
      return permissiveModulePermissionSourcePairs(moduleSlugs);
    },
    ...overrides,
  };
}
