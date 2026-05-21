/**
 * Cross-service module integration ports (HTTP adapters live in user-management-svc).
 *
 * Vocabulary:
 * - **module slug** — `master_data.modules.slug`; stored on `capabilities.module`
 * - **tenant-enabled modules** — Configurator `tenant_modules` rows (`module_id` UUIDs)
 * - **runtime capability** — UM `capabilities` row consumed by Cerbos via `capability_key`
 */

export type ModuleEntitlementRequestContext = {
  /** Forwarded `Authorization` header for upstream services that require bearer auth. */
  authorization?: string;
  /**
   * `bypass-cache` for mutation/entitlement assertions (fail-closed, never widen from stale data).
   * `use-cache` (default) for read-heavy assignable catalog paths.
   */
  cachePolicy?: "use-cache" | "bypass-cache";
};

/** Configurator authority: which modules are enabled for a tenant. */
export interface TenantModuleEntitlementPort {
  listTenantEnabledModuleIds(
    tenantId: string,
    context?: ModuleEntitlementRequestContext,
  ): Promise<string[]>;
}

/** Master Data authority: module catalog (`module_id` → `slug`). */
export interface MasterDataModuleCatalogPort {
  resolveModuleSlugsByIds(moduleIds: string[]): Promise<Map<string, string>>;
  /**
   * Expands enabled catalog slugs to include every descendant module slug in the tree.
   * L1 `tenant_modules` rows imply L2+ permissions linked on child modules.
   */
  expandEnabledModuleSlugs(moduleSlugs: readonly string[]): Promise<readonly string[]>;
}

/** @deprecated Use {@link ModuleEntitlementRequestContext}. */
export type EntitlementRequestContext = ModuleEntitlementRequestContext;

/** @deprecated Use {@link TenantModuleEntitlementPort}. */
export type TenantEntitlementPort = TenantModuleEntitlementPort;

/** @deprecated Use {@link MasterDataModuleCatalogPort}. */
export type ModuleCatalogPort = MasterDataModuleCatalogPort;
