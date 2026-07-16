/**
 * Enterprise navigation manifest node — pure metadata; no React imports.
 */
export type NavigationNode = {
  id: string;
  label: string;
  /** Key into `NAVIGATION_ICONS` (lucide icon name). */
  icon?: string;
  route?: string;
  search?: Record<string, unknown>;
  /** Any listed capability grants visibility. */
  requiredCapabilities?: readonly string[];
  /** Every listed capability required. */
  requiredCapabilitiesAll?: readonly string[];
  /** Every listed tenant module slug must be enabled. */
  requiredModules?: readonly string[];
  /** At least one listed tenant module slug must be enabled. */
  requiredModulesAny?: readonly string[];
  /** At least one JWT / principal role code must be present (UX gate; case-insensitive). */
  requiredRolesAny?: readonly string[];
  /**
   * Master Data `modules.slug` for route-based capability matching when the URL segment
   * differs from the catalog slug (optional; usually inferred from `route`).
   */
  catalogModuleSlug?: string;
  /** When true, only platform super-admins see this node. */
  superAdminOnly?: boolean;
  /**
   * When true, only tenant administrators and platform super-admins see this node.
   * Superadmin: unlocked only while operating as a selected facility tenant.
   */
  tenantAdminOnly?: boolean;
  children?: NavigationNode[];
};

export type NavFilterContext = {
  hasCapability: (key: string) => boolean;
  hasAnyCapability: (keys: readonly string[]) => boolean;
  hasAllCapabilities: (keys: readonly string[]) => boolean;
  /** `null` = tenant_modules not resolved yet — gated nodes are hidden. */
  enabledModuleSlugs: ReadonlySet<string> | null;
  /** When true, capability gates are not evaluated (tests only). */
  bypassCapabilityGates?: boolean;
  /** True when the current principal is a platform superadmin. */
  isSuperAdmin?: boolean;
  /** True when the current principal is a tenant administrator. */
  isTenantAdmin?: boolean;
  /** Module catalog index for visibility_scope lookups. */
  catalogIndex?: import('@/platform/modules/types').ModuleCatalogIndex | null;
  /**
   * L1 catalog product access via any L2+ runtime key prefix (e.g. `users:users:read` for User Management).
   */
  hasAnyCapabilityForProduct?: (catalogProductSlugs: readonly string[]) => boolean;
  /** Built by `buildNavFilterContext`; used for catalog-driven route ↔ capability matching. */
  navAccess?: import('./nav-capability-access').NavCapabilityAccessInput;
  /** Merged JWT + permissions-store role codes (normalized lowercase). */
  principalRoles?: readonly string[];
};
