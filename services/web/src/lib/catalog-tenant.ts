import { decodeAccessTokenPayload } from '@/lib/access-token';

/**
 * Visitpad / master-data catalog sends `iq_tenant_id` when the active tenant id is a
 * **lexical UUID string** (8-4-4-4-12 hex), matching backend `UUID` parsing.
 *
 * Non-UUID tenant slugs omit the header so requests hit the **global_master** catalog.
 */

/** Stable demo tenant used for static “tenant catalog” dev login (matches integration tests). */
export const DEV_TENANT_IQ_CATALOG_UUID = '00000000-0000-0000-0000-000000000007';

/**
 * Default `iq_tenant_id` for EMPI / Registration when no tenant is selected in the UI
 * (Phase 0 dev — replaced by session tenant from better-auth).
 */
export const DEV_DEFAULT_IQ_TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';

/** `make seed` hospital tenant — owns `billing.tariff_master` rows in dev. */
export const BILLING_TARIFF_DEV_TENANT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';

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

/**
 * Tenant header for services that require `iq_tenant_id` (EMPI, Registration).
 * Prefers a UUID from the tenant store; otherwise uses dev default (or `VITE_DEFAULT_IQ_TENANT_ID`).
 */
export function serviceIqTenantHeaderValue(tenantId: string | null | undefined): string {
  const catalog = catalogIqTenantHeaderValue(tenantId);
  if (catalog) return catalog;

  const fromEnv = import.meta.env.VITE_DEFAULT_IQ_TENANT_ID?.trim();
  if (fromEnv && CATALOG_IQ_TENANT_UUID_RE.test(fromEnv)) {
    return fromEnv.toLowerCase();
  }

  const trimmed = tenantId?.trim();
  if (trimmed) return trimmed;

  return DEV_DEFAULT_IQ_TENANT_ID;
}

/** `iq_tenant_id` from the access JWT (`iq_tenant_id` claim), when present. */
export function jwtIqTenantHeaderValue(accessToken: string | null | undefined): string | null {
  const claim = decodeAccessTokenPayload(accessToken)?.iq_tenant_id;
  return catalogIqTenantHeaderValue(typeof claim === 'string' ? claim : null);
}

const skipEmpiPlaceholder = (id: string | null | undefined) =>
  id && id !== DEV_DEFAULT_IQ_TENANT_ID ? id : null;

/**
 * Billing tariff lookup is per hospital tenant. Skips the EMPI dev placeholder so
 * `captureCharge` finds `tariff_master` rows (avoids `catalog_row_not_found`).
 */
export function billingIqTenantHeaderValue(
  tenantId: string | null | undefined,
  accessToken: string | null | undefined,
): string {
  const fromJwt = skipEmpiPlaceholder(jwtIqTenantHeaderValue(accessToken));
  const fromStore = skipEmpiPlaceholder(catalogIqTenantHeaderValue(tenantId));
  if (fromJwt) return fromJwt;
  if (fromStore) return fromStore;
  if (import.meta.env.DEV) return BILLING_TARIFF_DEV_TENANT_ID;
  return serviceIqTenantHeaderValue(tenantId);
}
