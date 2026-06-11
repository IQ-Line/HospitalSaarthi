const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Human-readable tenant label — never surfaces a raw tenant UUID in the chrome. */
export function resolveTenantDisplayName(
  name: string | null | undefined,
  fallback = 'HIMS',
): string {
  const trimmed = name?.trim();
  if (!trimmed || UUID_RE.test(trimmed)) return fallback;
  return trimmed;
}
