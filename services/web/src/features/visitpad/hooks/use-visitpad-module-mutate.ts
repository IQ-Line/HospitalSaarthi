import { catalogModuleCrudAccess } from '@/lib/catalog-module-crud-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

/** @deprecated Prefer {@link useCatalogModuleCrud} with the manifest `catalogModuleSlug`. */
export function useVisitpadModuleMutate(moduleSlug: string): boolean {
  return useCatalogModuleCrud(moduleSlug).canMutate;
}

/** Non-hook check for tests and server-aligned helpers. */
export function visitpadModuleCanMutate(
  capabilityKeys: ReadonlySet<string>,
  moduleSlug: string,
): boolean {
  return catalogModuleCrudAccess(capabilityKeys, moduleSlug).canMutate;
}
