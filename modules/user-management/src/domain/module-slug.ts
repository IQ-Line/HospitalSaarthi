/**
 * `capabilities.module` MUST equal `master_data.modules.slug` (kebab-case catalog slug).
 * Configurator `tenant_modules.module_id` resolves to this slug via Master Data.
 */

import { InvalidModuleSlugError } from "./errors.js";

/** Lowercase kebab-case module slug (aligned with Master Data `modules.slug`). */
export const MODULE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CapabilitySourceCatalog = "master_data";

export function normalizeModuleSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidModuleSlug(slug: string): boolean {
  const normalized = normalizeModuleSlug(slug);
  return normalized.length > 0 && MODULE_SLUG_PATTERN.test(normalized);
}

export function assertValidModuleSlug(slug: string, label = "module slug"): string {
  const normalized = normalizeModuleSlug(slug);
  if (!isValidModuleSlug(normalized)) {
    throw new InvalidModuleSlugError(
      `${label} must be a non-empty kebab-case slug aligned with master_data.modules.slug`,
    );
  }
  return normalized;
}

export function normalizeModuleSlugSet(slugs: Iterable<string>): string[] {
  return [...new Set([...slugs].map(normalizeModuleSlug).filter((slug) => slug.length > 0))];
}
