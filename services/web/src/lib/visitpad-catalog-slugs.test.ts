import { describe, expect, it } from 'vitest';
import {
  isVisitpadL3CatalogModuleSlug,
  VISITPAD_CATALOG_SECTIONS,
} from './visitpad-catalog-slugs';
import { isVisitpadCatalogApiPath, visitpadCatalogOmitsIqTenantHeader } from './catalog-tenant';

describe('isVisitpadL3CatalogModuleSlug', () => {
  it('returns false for empty and non-visitpad slugs', () => {
    expect(isVisitpadL3CatalogModuleSlug('')).toBe(false);
    expect(isVisitpadL3CatalogModuleSlug('users')).toBe(false);
    expect(isVisitpadL3CatalogModuleSlug('departments')).toBe(false);
  });

  it('matches canonical and variant slugs', () => {
    expect(isVisitpadL3CatalogModuleSlug('units')).toBe(true);
    expect(isVisitpadL3CatalogModuleSlug('rxcolumns')).toBe(true);
    expect(isVisitpadL3CatalogModuleSlug('unit-conversions')).toBe(true);
  });

  it('covers every catalog section slug', () => {
    for (const { catalogSlug } of VISITPAD_CATALOG_SECTIONS) {
      expect(isVisitpadL3CatalogModuleSlug(catalogSlug)).toBe(true);
    }
  });
});

describe('isVisitpadCatalogApiPath', () => {
  it('returns false for non-visitpad paths', () => {
    expect(isVisitpadCatalogApiPath('/api/v1/master-data/modules')).toBe(false);
    expect(isVisitpadCatalogApiPath('/api/user-management/users')).toBe(false);
  });

  it('returns true for visitpad catalog paths', () => {
    expect(isVisitpadCatalogApiPath('/api/v1/master-data/visitpad/vitals')).toBe(true);
  });
});

describe('visitpadCatalogOmitsIqTenantHeader', () => {
  it('returns false for non-visitpad paths even for super-admin', () => {
    expect(
      visitpadCatalogOmitsIqTenantHeader({
        path: '/api/v1/master-data/modules',
        authRoles: ['super-admin'],
      }),
    ).toBe(false);
  });
});
