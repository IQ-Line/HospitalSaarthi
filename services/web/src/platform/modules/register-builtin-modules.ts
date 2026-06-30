import { registerModuleManifest } from './module-registry';
import { invalidateComposedNavigationCache } from './module-manifest-loader';
import { billingAndFinanceModuleManifest } from './manifests/billing-and-finance.manifest';
import { configuratorModuleManifest } from './manifests/configurator.manifest';
import { dashboardModuleManifest } from './manifests/dashboard.manifest';
import { frontdeskModuleManifest } from './manifests/frontdesk.manifest';
import { inventoryModuleManifest } from './manifests/inventory.manifest';
import { inventorySupplyMastersModuleManifest } from './manifests/inventory-supply-masters.manifest';
import { nurseModuleManifest } from './manifests/nurse.manifest';
import { doctorModuleManifest } from './manifests/doctor.manifest';
import { pharmacyModuleManifest } from './manifests/pharmacy.manifest';
import { masterDataModuleManifest } from './manifests/master-data.manifest';
import { userManagementModuleManifest } from './manifests/user-management.manifest';
import { visitpadModuleManifest } from './manifests/visitpad.manifest';

const BUILTIN_MODULE_MANIFESTS = [
  dashboardModuleManifest,
  masterDataModuleManifest,
  inventorySupplyMastersModuleManifest,
  userManagementModuleManifest,
  doctorModuleManifest,
  nurseModuleManifest,
  pharmacyModuleManifest,
  frontdeskModuleManifest,
  inventoryModuleManifest,
  billingAndFinanceModuleManifest,
  visitpadModuleManifest,
  configuratorModuleManifest,
] as const;

/** Idempotent — registers built-in SPA module manifests at bootstrap. */
export function registerBuiltinModuleManifests(): void {
  for (const manifest of BUILTIN_MODULE_MANIFESTS) {
    registerModuleManifest(manifest);
  }
  invalidateComposedNavigationCache();
}
