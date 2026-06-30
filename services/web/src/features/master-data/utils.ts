/** Lowercase slug fragment from a display name (shared across master-data forms). */
export function toSlug(value?: string | null): string {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    // eslint-disable-next-line sonarjs/slow-regex -- linear regex on bounded/trusted input; the flagged quantifiers cannot catastrophically backtrack (#50 verified)
    .replace(/^-+|-+$/g, '');
}
