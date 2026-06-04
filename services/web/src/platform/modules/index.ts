export type { ModuleCatalogEntry, ModuleCatalogIndex, ModuleManifest } from './types';
export {
  clearModuleRegistryForTests,
  getModuleManifestBySlug,
  getRegisteredModuleManifests,
  registerModuleManifest,
} from './module-registry';
export {
  composeNavigationManifest,
  invalidateComposedNavigationCache,
  manifestToNavigationNode,
} from './module-manifest-loader';
export { collectNavigationCapabilityKeys } from './collect-navigation-capability-keys';
export {
  invalidateModuleRegistration,
  moduleCatalogQueryOptions,
  useModuleCatalog,
} from './module-catalog';
export { globalModulesCatalogQueryOptions, MODULE_CATALOG_STALE_MS } from '@/features/master-data/api/modules';
export { registerBuiltinModuleManifests } from './register-builtin-modules';
export {
  catalogSlugSetFromIndex,
  isCatalogL1Module,
  useEnabledTenantModuleSlugs,
} from './use-enabled-tenant-modules';
export { useComposedNavigationManifest } from './use-composed-navigation';
