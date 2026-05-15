import { describe, expect, it } from 'vitest';
import {
  catalogIqTenantHeaderValue,
  DEV_TENANT_IQ_CATALOG_UUID,
  isVisitpadTenantCatalogScope,
} from './catalog-tenant';

describe('catalogIqTenantHeaderValue', () => {
  it('returns null for slug tenant ids', () => {
    expect(catalogIqTenantHeaderValue('tenant-001')).toBeNull();
    expect(catalogIqTenantHeaderValue(null)).toBeNull();
    expect(catalogIqTenantHeaderValue('')).toBeNull();
  });

  it('accepts dev sentinel UUID (nil-style) used for tenant catalog login', () => {
    expect(catalogIqTenantHeaderValue(DEV_TENANT_IQ_CATALOG_UUID)).toBe(
      DEV_TENANT_IQ_CATALOG_UUID.toLowerCase(),
    );
  });

  it('normalizes uppercase UUID', () => {
    expect(catalogIqTenantHeaderValue('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
  });

  it('strips whitespace', () => {
    expect(catalogIqTenantHeaderValue(`  ${DEV_TENANT_IQ_CATALOG_UUID}  `)).toBe(
      DEV_TENANT_IQ_CATALOG_UUID.toLowerCase(),
    );
  });
});

describe('isVisitpadTenantCatalogScope', () => {
  it('is true only when a catalog header would be sent', () => {
    expect(isVisitpadTenantCatalogScope('tenant-001')).toBe(false);
    expect(isVisitpadTenantCatalogScope(DEV_TENANT_IQ_CATALOG_UUID)).toBe(true);
  });
});
