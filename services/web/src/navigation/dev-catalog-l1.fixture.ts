import type { ModuleCatalogEntry, ModuleCatalogIndex } from '@/platform/modules/types';

/** Active catalog rows from a typical `make setup` global_master.modules tree (May 2026). */
export const DEV_CATALOG_L1_FIXTURE: ModuleCatalogIndex = (() => {
  const l1: Array<{ id: string; slug: string; name: string; module_kind: 'platform' | 'foundation' | 'product' }> = [
    { id: '1b87bdf1-3250-4ef4-803a-39c48dc6bf57', slug: 'user-management', name: 'User Management', module_kind: 'platform' },
    { id: '66666666-6666-4666-8666-666666666601', slug: 'frontdesk', name: 'Frontdesk', module_kind: 'product' },
    { id: 'a1000001-0001-4001-8001-000000000001', slug: 'opd', name: 'opd', module_kind: 'product' },
    { id: 'a3e55e7c-204d-47ce-abdb-d1785f6e0135', slug: 'configurator', name: 'Onboarding', module_kind: 'platform' },
    { id: 'cbd0d113-5596-4ab0-a082-8f70aebc5fe8', slug: 'empi', name: 'EMPI', module_kind: 'foundation' },
    { id: 'e4229c7d-ab3b-4d5a-801f-0ad5fe81580d', slug: 'master-data', name: 'Master Data', module_kind: 'platform' },
  ];

  const byId = new Map<string, ModuleCatalogEntry>();
  const bySlug = new Map<string, ModuleCatalogEntry>();

  for (const row of l1) {
    const entry: ModuleCatalogEntry = {
      ...row,
      icon: null,
      category: 'core',
      is_active: true,
      level: 1,
      parent_id: null,
    };
    byId.set(row.id, entry);
    bySlug.set(row.slug, entry);
  }

  const masterData = bySlug.get('master-data');
  const visitpadMaster: ModuleCatalogEntry = {
    id: '71521630-5637-4aa9-809c-363cfa4ebdd3',
    slug: 'visitpad-master',
    name: 'Visitpad Master',
    icon: null,
    category: 'clinical',
    is_active: true,
    level: 2,
    parent_id: masterData?.id ?? null,
    module_kind: 'platform',
  };
  byId.set(visitpadMaster.id, visitpadMaster);
  bySlug.set(visitpadMaster.slug, visitpadMaster);

  const vaccines: ModuleCatalogEntry = {
    id: '09616489-794b-4e11-bf0b-1cda9c331571',
    slug: 'vaccines',
    name: 'Vaccines',
    icon: null,
    category: 'clinical',
    is_active: true,
    level: 3,
    parent_id: visitpadMaster.id,
    module_kind: 'platform',
  };
  byId.set(vaccines.id, vaccines);
  bySlug.set(vaccines.slug, vaccines);

  return { byId, bySlug };
})();
