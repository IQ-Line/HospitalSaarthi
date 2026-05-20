import type { ModuleCatalogIndex } from '@/platform/modules/types';

/** Active L1 rows from a typical `make setup` global_master.modules catalog (May 2026). */
export const DEV_CATALOG_L1_FIXTURE: ModuleCatalogIndex = (() => {
  const l1 = [
    { id: '1b87bdf1-3250-4ef4-803a-39c48dc6bf57', slug: 'user-management', name: 'User Management' },
    { id: '55555555-5555-4555-8555-555555555501', slug: 'visitpad-templates', name: 'visitpad_templates' },
    { id: '66666666-6666-4666-8666-666666666601', slug: 'frontdesk', name: 'Frontdesk' },
    { id: 'a1000001-0001-4001-8001-000000000001', slug: 'opd', name: 'opd' },
    { id: 'a3e55e7c-204d-47ce-abdb-d1785f6e0135', slug: 'configurator', name: 'Onboarding' },
    { id: 'cbd0d113-5596-4ab0-a082-8f70aebc5fe8', slug: 'empi', name: 'EMPI' },
    { id: 'e4229c7d-ab3b-4d5a-801f-0ad5fe81580d', slug: 'master-data', name: 'Master Data' },
  ] as const;

  const byId = new Map<string, (typeof l1)[number] & { level: number; parent_id: null }>();
  const bySlug = new Map<string, (typeof l1)[number] & { level: number; parent_id: null }>();

  for (const row of l1) {
    const entry = {
      ...row,
      icon: null,
      category: 'core' as const,
      is_active: true,
      level: 1,
      parent_id: null,
    };
    byId.set(row.id, entry);
    bySlug.set(row.slug, entry);
  }

  // L3 Visitpad catalog row — must not appear as a sidebar root module.
  const vaccines = {
    id: '09616489-794b-4e11-bf0b-1cda9c331571',
    slug: 'vaccines',
    name: 'Vaccines',
    icon: null,
    category: 'clinical' as const,
    is_active: true,
    level: 3,
    parent_id: '71521630-5637-4aa9-809c-363cfa4ebdd3',
  };
  byId.set(vaccines.id, vaccines);
  bySlug.set(vaccines.slug, vaccines);

  return { byId, bySlug };
})();
