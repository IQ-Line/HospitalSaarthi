import {
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
  DEVELOPMENT_EMPI_PLACEHOLDER_TENANT_ID,
} from "@hims/dev-bootstrap";

/** @deprecated Use {@link DEVELOPMENT_EMPI_PLACEHOLDER_TENANT_ID}. */
export const EMPI_DEV_PLACEHOLDER_TENANT_ID = DEVELOPMENT_EMPI_PLACEHOLDER_TENANT_ID;

/** @deprecated Use {@link DEVELOPMENT_BOOTSTRAP_TENANT_ID}. */
export const BILLING_TARIFF_DEV_TENANT_ID = DEVELOPMENT_BOOTSTRAP_TENANT_ID;

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
    candidate === DEVELOPMENT_EMPI_PLACEHOLDER_TENANT_ID
  ) {
    const remap =
      normalizeTenantHeader(process.env["BILLING_DEV_TENANT_ID"]) ??
      DEVELOPMENT_BOOTSTRAP_TENANT_ID;
    return remap;
  }

  return candidate;
}
