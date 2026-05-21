/**
 * EMPI module dev default — not where Phase 0 tariffs are stored.
 * Tariffs for visit registration live on the seed/configurator tenant (`f47ac10b-…`).
 */
export const EMPI_DEV_PLACEHOLDER_TENANT_ID = "550e8400-e29b-41d4-a716-446655440001";

/** Configurator + `make seed` dev hospital tenant (see `packages/dev-bootstrap`). */
export const BILLING_TARIFF_DEV_TENANT_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d480";

function normalizeTenantHeader(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
}

/**
 * Resolves `iq_tenant_id` / `x-tenant-id` for billing routes.
 * In development, remaps the EMPI placeholder to the tenant that owns `billing.tariff_master` rows.
 */
export function resolveBillingRequestTenantId(
  headers: { "iq_tenant_id"?: unknown; "x-tenant-id"?: unknown },
  fallbackTenantId: string,
): string {
  const fromHeader =
    normalizeTenantHeader(headers["iq_tenant_id"]) ??
    normalizeTenantHeader(headers["x-tenant-id"]);

  const candidate = fromHeader ?? fallbackTenantId.trim().toLowerCase();

  if (
    process.env["NODE_ENV"] !== "production" &&
    candidate === EMPI_DEV_PLACEHOLDER_TENANT_ID
  ) {
    const remap =
      normalizeTenantHeader(process.env["BILLING_DEV_TENANT_ID"]) ??
      BILLING_TARIFF_DEV_TENANT_ID;
    return remap;
  }

  return candidate;
}
