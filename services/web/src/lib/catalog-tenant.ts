/**
 * Visitpad / master-data catalog sends `iq_tenant_id` when the active tenant id is a
 * **lexical UUID string** (8-4-4-4-12 hex), matching backend `UUID` parsing.
 *
 * Non-UUID tenant slugs (e.g. `tenant-001` from legacy dev login) omit the header so
 * requests hit the **global** `public` catalog.
 */

/** Stable demo tenant used for static “tenant catalog” dev login (matches integration tests). */
export const DEV_TENANT_IQ_CATALOG_UUID = '00000000-0000-0000-0000-000000000007';

/**
 * Lexical UUID (8-4-4-4-12 hex). Matches Python/Postgres-style `UUID` acceptance, including
 * sentinel ids like `00000000-0000-0000-0000-000000000007` used in dev + integration tests.
 * Slugs such as `tenant-001` do not match (wrong segment lengths / non-hex).
 */
const CATALOG_IQ_TENANT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function catalogIqTenantHeaderValue(tenantId: string | null | undefined): string | null {
  if (tenantId == null) return null;
  const s = tenantId.trim();
  if (!s) return null;
  if (!CATALOG_IQ_TENANT_UUID_RE.test(s)) return null;
  return s.toLowerCase();
}

export function isVisitpadTenantCatalogScope(tenantId: string | null | undefined): boolean {
  return catalogIqTenantHeaderValue(tenantId) != null;
}
