import type { IncomingHttpHeaders } from "node:http";

const TENANT_HEADER_KEYS = ["iq_tenant_id", "x-tenant-id"] as const;

export function resolvePharmacyRequestTenantId(
  headers: IncomingHttpHeaders,
  devFallbackTenantId: string,
): string {
  for (const key of TENANT_HEADER_KEYS) {
    const raw = headers[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return devFallbackTenantId;
}
