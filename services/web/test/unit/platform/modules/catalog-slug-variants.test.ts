import { describe, expect, it } from 'vitest';
import { addCatalogSlugToSet, catalogSlugVariants } from '../../../../src/platform/modules/catalog-slug-variants';

describe('catalogSlugVariants', () => {
  it('includes kebab and underscore forms for visitpad catalog slug', () => {
    expect(catalogSlugVariants('visitpad_templates')).toEqual(
      expect.arrayContaining(['visitpad_templates', 'visitpad-templates']),
    );
  });

  it('returns an empty list for blank or missing slugs', () => {
    expect(catalogSlugVariants(undefined)).toEqual([]);
    expect(catalogSlugVariants(null)).toEqual([]);
    expect(catalogSlugVariants('   ')).toEqual([]);
  });

  it('adds all variants to a set', () => {
    const slugs = new Set<string>();
    addCatalogSlugToSet(slugs, 'visitpad-templates');
    expect(slugs.has('visitpad-templates')).toBe(true);
    expect(slugs.has('visitpad_templates')).toBe(true);
  });
});
