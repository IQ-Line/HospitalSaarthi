/**
 * Manifest slugs use kebab-case; Master Data catalog may use underscores (e.g. visitpad_templates).
 */
export function catalogSlugVariants(slug: string | null | undefined): string[] {
  const normalized = slug?.trim() ?? '';
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);
  if (normalized.includes('_')) {
    variants.add(normalized.replaceAll('_', '-'));
  }
  if (normalized.includes('-')) {
    variants.add(normalized.replaceAll('-', '_'));
  }
  return [...variants];
}

export function addCatalogSlugToSet(target: Set<string>, slug: string | null | undefined): void {
  for (const variant of catalogSlugVariants(slug)) {
    target.add(variant);
  }
}
