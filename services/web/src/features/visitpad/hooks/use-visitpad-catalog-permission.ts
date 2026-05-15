import { VISITPAD_CATALOG_FEATURE, VISITPAD_TEMPLATES_MODULE } from '@/lib/permissions-map';
import { usePermissionsStore, type PermissionsState } from '@/stores/permissions.store';

/** UX gate for Visitpad template catalog (coarse `catalog` feature until per-section keys exist). */
export function useVisitpadCatalogPermission() {
  const canRead = usePermissionsStore((s: PermissionsState) =>
    s.hasFeaturePermission(VISITPAD_TEMPLATES_MODULE, VISITPAD_CATALOG_FEATURE, 'read'),
  );
  const canWrite = usePermissionsStore((s: PermissionsState) =>
    s.hasFeaturePermission(VISITPAD_TEMPLATES_MODULE, VISITPAD_CATALOG_FEATURE, 'write'),
  );
  return { canRead, canWrite };
}
