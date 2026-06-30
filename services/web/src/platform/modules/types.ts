import type { NavigationNode } from '@/navigation/types';

/**
 * SPA registration contract for a platform or tenant-scoped module.
 * Navigation and routes are declared here; enablement comes from Configurator
 * `tenant_modules` resolved against the Master Data module catalog.
 */
export type ModuleManifest = {
  /** Master Data `modules.slug` — primary join key for tenant enablement. */
  slug: string;
  /** Sidebar / discovery label (catalog name may override at runtime). */
  name: string;
  icon?: string;
  /** TanStack Router prefix for this module (e.g. `/user-management`). */
  routePrefix: string;
  /** Child nav nodes; may be a single leaf (dashboard) or a group. */
  navigation: NavigationNode[];
  /** When true, a single nav child stays under a labeled group (sidebar dropdown). */
  keepNavigationGroup?: boolean;
  /** Any listed capability grants visibility for the module root. */
  requiredCapabilities?: readonly string[];
  /**
   * When false, nav is not gated on tenant_modules (platform shell modules).
   * @default true
   */
  tenantScoped?: boolean;
  /**
   * At least one of these catalog slugs must be enabled for the tenant.
   * Used when multiple catalog rows satisfy one product area (e.g. visitpad).
   */
  requiredModulesAny?: readonly string[];
  /**
   * Every one of these catalog slugs must be enabled for the tenant (AND gate),
   * for modules that compose strictly across several catalog rows.
   */
  requiredModules?: readonly string[];
  /** At least one JWT role code required to show this module in the sidebar. */
  requiredRolesAny?: readonly string[];
  /** Lower numbers appear earlier in the sidebar (after dashboard). */
  sortOrder?: number;
};

export type ModuleCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  category: string;
  is_active: boolean;
  /** Tree depth from Master Data (`1` = L1 product module). */
  level: number;
  parent_id: string | null;
  module_kind?: 'platform' | 'foundation' | 'product';
  display_order?: number;
  visibility_scope?: 'superadmin' | 'tenant';
};

export type ModuleCatalogIndex = {
  byId: ReadonlyMap<string, ModuleCatalogEntry>;
  bySlug: ReadonlyMap<string, ModuleCatalogEntry>;
};
