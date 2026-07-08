import type { IncomingHttpHeaders } from "node:http";

function pickHeaderTenant(headers: IncomingHttpHeaders): string | undefined {
  for (const raw of [headers.iq_tenant_id, headers["x-tenant-id"]]) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function isProductionPharmacyRuntime(): boolean {
  return process.env["NODE_ENV"] === "production" || process.env["AUTH_POLICY"] === "required";
}

/**
 * Dev-only fallback when Swagger/curl omit tenant headers before JWT is available.
 * In production, callers must supply iq_tenant_id or authenticate so tenantPlugin can resolve it.
 */
export function resolvePharmacyDevFallbackTenantId(devFallbackTenantId: string): string {
  if (isProductionPharmacyRuntime()) {
    throw new Error(
      "PHARMACY_DEV_TENANT_ID fallback is disabled in production — supply iq_tenant_id or authenticate",
    );
  }
  return devFallbackTenantId;
}

export function resolvePharmacyRequestTenantId(
  headers: IncomingHttpHeaders,
  devFallbackTenantId: string,
): string {
  const fromHeader = pickHeaderTenant(headers);
  if (fromHeader) {
    return fromHeader;
  }
  return resolvePharmacyDevFallbackTenantId(devFallbackTenantId);
}
