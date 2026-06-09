import type { Module } from '@/features/master-data/types';

/** L1 product roots (`level = 1`, no parent) — tenant enablement is L1-only; L2+ follow via catalog expansion. */
export function isCatalogL1Module(mod: Pick<Module, 'level' | 'parent_id'>): boolean {
  return mod.level === 1 && mod.parent_id == null;
}

/** Active L1 modules for Configurator tenant enablement toggles. */
export function filterCatalogL1Modules(modules: readonly Module[]): Module[] {
  return modules
    .filter((mod) => !mod.is_deleted && isCatalogL1Module(mod))
    .sort(
      (a, b) =>
        (a.display_order ?? 0) - (b.display_order ?? 0) ||
        a.name.localeCompare(b.name),
    );
}
