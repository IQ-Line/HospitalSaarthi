import type { ModuleManifest } from './types';

const registry = new Map<string, ModuleManifest>();

/** Register a module manifest (built-in or future plugin). Idempotent per slug. */
export function registerModuleManifest(manifest: ModuleManifest): void {
  registry.set(manifest.slug, manifest);
}

export function getRegisteredModuleManifests(): readonly ModuleManifest[] {
  return [...registry.values()].sort((a, b) => {
    const orderA = a.sortOrder ?? 100;
    const orderB = b.sortOrder ?? 100;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

export function getModuleManifestBySlug(slug: string): ModuleManifest | undefined {
  return registry.get(slug);
}

/** @internal Vitest only */
export function clearModuleRegistryForTests(): void {
  registry.clear();
}
