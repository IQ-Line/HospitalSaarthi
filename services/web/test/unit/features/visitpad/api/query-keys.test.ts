import { describe, expect, it } from 'vitest';
import {
  visitpadCatalogListPathFromBasePath,
  visitpadInvalidationKeysForCatalogBasePath,
  visitpadKeys,
} from '../../../../../src/features/visitpad/api/query-keys';

describe('visitpadInvalidationKeysForCatalogBasePath', () => {
  it('maps vitals base path to vitals list keys only', () => {
    const keys = visitpadInvalidationKeysForCatalogBasePath('/api/v1/master-data/visitpad/vitals');
    expect(keys).toContainEqual(visitpadKeys.vitals());
    expect(keys.some((k) => k.includes('units'))).toBe(false);
  });

  it('maps units base path to units list keys only', () => {
    const keys = visitpadInvalidationKeysForCatalogBasePath('/api/v1/master-data/visitpad/units');
    expect(keys).toContainEqual(visitpadKeys.units());
    expect(keys.some((k) => k.includes('vitals'))).toBe(false);
  });

  it('parses list path from REST base path', () => {
    expect(visitpadCatalogListPathFromBasePath('/api/v1/master-data/visitpad/chief-complaints')).toBe(
      '/chief-complaints',
    );
  });
});
