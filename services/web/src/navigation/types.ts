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
  children?: NavigationNode[];
};

export type NavFilterContext = {
  hasCapability: (key: string) => boolean;
  hasAnyCapability: (keys: readonly string[]) => boolean;
  hasAllCapabilities: (keys: readonly string[]) => boolean;
  /** `null` = tenant_modules not resolved yet — gated nodes are hidden. */
  enabledModuleSlugs: ReadonlySet<string> | null;
  /**
   * Platform super-admin: tenant_modules still apply; capability gates are not evaluated.
   */
  bypassCapabilityGates?: boolean;
};
