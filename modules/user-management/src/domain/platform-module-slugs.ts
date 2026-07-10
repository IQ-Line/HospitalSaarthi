/**
 * Platform runtime module slugs are always included in the tenant *assignable* capability set,
 * even when Configurator has no `tenant_modules` rows for the tenant.
 *
 * These MUST be true platform modules (shared infrastructure), not clinical/line-of-business modules.
 * Each entry MUST match `master_data.modules.slug` (validated at load).
 *
 * Do not use wildcards or patterns here — only explicit slugs.
 */

import { assertValidModuleSlug, normalizeModuleSlug } from "./module-slug.js";

const RAW_PLATFORM_RUNTIME_MODULE_SLUGS = ["user-management", "configurator"] as const;

const PLATFORM_RUNTIME_SLUG_SET = new Set<string>();
for (const raw of RAW_PLATFORM_RUNTIME_MODULE_SLUGS) {
  PLATFORM_RUNTIME_SLUG_SET.add(assertValidModuleSlug(raw, "PLATFORM_RUNTIME_MODULE_SLUGS entry"));
}

export const PLATFORM_RUNTIME_MODULE_SLUGS = RAW_PLATFORM_RUNTIME_MODULE_SLUGS;

export type PlatformRuntimeModuleSlug = (typeof PLATFORM_RUNTIME_MODULE_SLUGS)[number];

/** @deprecated Use {@link PLATFORM_RUNTIME_MODULE_SLUGS}. */
export const PLATFORM_ASSIGNABLE_MODULE_SLUGS = PLATFORM_RUNTIME_MODULE_SLUGS;

/** @deprecated Use {@link PlatformRuntimeModuleSlug}. */
// eslint-disable-next-line sonarjs/redundant-type-aliases -- exported public type name (deprecated back-compat alias)
export type PlatformAssignableModuleSlug = PlatformRuntimeModuleSlug;

export function isPlatformRuntimeModuleSlug(slug: string): boolean {
  return PLATFORM_RUNTIME_SLUG_SET.has(normalizeModuleSlug(slug));
}
