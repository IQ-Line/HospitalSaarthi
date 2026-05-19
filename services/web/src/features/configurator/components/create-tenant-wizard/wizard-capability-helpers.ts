import type { Capability } from '@/features/user-management/types';
import type { Module } from '@/features/master-data/types';

const PLATFORM_MODULE_SLUGS = new Set(['user-management', 'configurator']);

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

export function moduleSlugsForIds(moduleIds: Set<string>, modules: Module[]): string[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const slugs = new Set<string>();
  for (const id of moduleIds) {
    const slug = byId.get(id)?.slug;
    if (slug) slugs.add(normalizeSlug(slug));
  }
  for (const platform of PLATFORM_MODULE_SLUGS) {
    slugs.add(platform);
  }
  return [...slugs];
}

/** Capabilities that can be granted for the modules selected in step 2. */
export function filterCapabilitiesForEnabledModules(
  capabilities: Capability[],
  enabledModuleSlugs: string[],
): Capability[] {
  const slugSet = new Set(enabledModuleSlugs.map(normalizeSlug));
  for (const platform of PLATFORM_MODULE_SLUGS) {
    slugSet.add(platform);
  }
  return capabilities.filter((c) => slugSet.has(normalizeSlug(c.module)));
}

/** Sensible defaults for a tenant administrator (UM + shell access for enabled modules). */
export function defaultTenantAdminCapabilityIds(capabilities: Capability[]): string[] {
  return capabilities
    .filter(
      (c) =>
        c.is_active &&
        (c.capability_key.startsWith('um:') ||
          c.capability_key.includes(':shell:') ||
          c.capability_key.startsWith('md:visitpad:')),
    )
    .map((c) => c.id);
}

export function findModuleIdBySlug(modules: Module[], slug: string): string | undefined {
  const target = normalizeSlug(slug);
  return modules.find((m) => normalizeSlug(m.slug) === target)?.id;
}

export function defaultEnabledModuleIds(modules: Module[]): Set<string> {
  const ids = new Set<string>();
  for (const slug of PLATFORM_MODULE_SLUGS) {
    const id = findModuleIdBySlug(modules, slug);
    if (id) ids.add(id);
  }
  return ids;
}

export function toRoleCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
