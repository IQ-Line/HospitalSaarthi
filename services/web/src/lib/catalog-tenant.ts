import { decodeAccessTokenPayload } from '@/lib/access-token';
import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import {
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
  DEVELOPMENT_EMPI_PLACEHOLDER_TENANT_ID,
  DEVELOPMENT_VISITPAD_CATALOG_TENANT_UUID,
} from '../../../../packages/dev-bootstrap/src/dev-tenant-ids';

const VISITPAD_CATALOG_API_PATH_PREFIX = '/api/v1/master-data/visitpad';
const DEPARTMENTS_CATALOG_API_PATH_PREFIX = '/api/v1/master-data/departments';
const INVENTORY_CATALOG_API_PATH_PREFIX = '/api/v1/master-data/inventory';

/**
 * Visitpad / master-data catalog sends `iq_tenant_id` when the active tenant id is a
 * **lexical UUID string** (8-4-4-4-12 hex), matching backend `UUID` parsing.
 *
 * Non-UUID tenant slugs omit the header so requests hit the **global_master** catalog.
 */

/** @deprecated Import {@link DEVELOPMENT_VISITPAD_CATALOG_TENANT_UUID} from dev-bootstrap. */
export const DEV_TENANT_IQ_CATALOG_UUID = DEVELOPMENT_VISITPAD_CATALOG_TENANT_UUID;

/** @deprecated Import {@link DEVELOPMENT_EMPI_PLACEHOLDER_TENANT_ID} from dev-bootstrap. */
export const DEV_DEFAULT_IQ_TENANT_ID = DEVELOPMENT_EMPI_PLACEHOLDER_TENANT_ID;

/** @deprecated Import {@link DEVELOPMENT_BOOTSTRAP_TENANT_ID} from dev-bootstrap. */
export const BILLING_TARIFF_DEV_TENANT_ID = DEVELOPMENT_BOOTSTRAP_TENANT_ID;

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

export function isVisitpadCatalogApiPath(path: string): boolean {
  return path.startsWith(VISITPAD_CATALOG_API_PATH_PREFIX);
}

export function isInventoryCatalogApiPath(path: string): boolean {
  return path.startsWith(INVENTORY_CATALOG_API_PATH_PREFIX);
}

/** Visitpad, departments, and inventory catalogs use ``global_master`` / ``tenant_master`` dual schemas. */
export function isMasterDataDualSchemaCatalogApiPath(path: string): boolean {
  return (
    path.startsWith(VISITPAD_CATALOG_API_PATH_PREFIX) ||
    path.startsWith(DEPARTMENTS_CATALOG_API_PATH_PREFIX) ||
    path.startsWith(INVENTORY_CATALOG_API_PATH_PREFIX)
  );
}

/**
 * Platform super-admin edits Visitpad / departments via `global_master` — omit `iq_tenant_id`.
 *
 * Inventory supply masters are hospital-operational: always tenant-scoped when a UUID tenant
 * is active (see {@link resolveInventoryCatalogScopeKey}).
 */
export function visitpadCatalogOmitsIqTenantHeader(input: {
  path: string;
  authRoles?: readonly string[];
  principalRoles?: readonly string[];
}): boolean {
  if (!isMasterDataDualSchemaCatalogApiPath(input.path)) {
    return false;
  }
  if (isInventoryCatalogApiPath(input.path)) {
    return false;
  }
  return resolvePlatformSuperAdmin({
    authRoles: input.authRoles,
    principalRoles: input.principalRoles,
  });
}

/** React Query scope for inventory master-data (`/api/v1/master-data/inventory/*`). */
export function resolveInventoryCatalogScopeKey(
  tenantId: string | null | undefined,
): string {
  return catalogIqTenantHeaderValue(tenantId) ?? 'global';
}

export function isVisitpadTenantCatalogScope(tenantId: string | null | undefined): boolean {
  return catalogIqTenantHeaderValue(tenantId) != null;
}

/** React Query / UI scope: `global` for platform super-admin, else tenant UUID or `global`. */
export function resolveVisitpadCatalogScopeKey(
  tenantId: string | null | undefined,
  authRoles?: readonly string[],
): string {
  if (resolvePlatformSuperAdmin({ authRoles })) {
    return 'global';
  }
  return catalogIqTenantHeaderValue(tenantId) ?? 'global';
}

/** Tenant-scoped Visitpad UX (import from platform library) — false for platform super-admin. */
export function isVisitpadTenantCatalogScopeForPrincipal(
  tenantId: string | null | undefined,
  authRoles?: readonly string[],
): boolean {
  if (resolvePlatformSuperAdmin({ authRoles })) {
    return false;
  }
  return isVisitpadTenantCatalogScope(tenantId);
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
