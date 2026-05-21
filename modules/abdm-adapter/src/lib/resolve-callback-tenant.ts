import { parseHipTenantMap } from "./hip-tenant-map.js";

/**
 * Maps inbound gateway callbacks to `iq_tenant_id`.
 * Production: `ABDM_HIP_TENANT_MAP` (HIP id → tenant). Dev fallback: `ABDM_DEV_TENANT_ID`.
 */
export function resolveCallbackTenantId(headers: Record<string, unknown>): string {
  const hipId = String(headers["x-hip-id"] ?? headers["X-HIP-ID"] ?? "").trim();
  const expectedHip = process.env["ABDM_X_HIP_ID"]?.trim();

  if (expectedHip && hipId && hipId.toLowerCase() !== expectedHip.toLowerCase()) {
    throw new Error(`X-HIP-ID mismatch: expected ${expectedHip}, got ${hipId}`);
  }

  if (hipId) {
    const map = parseHipTenantMap();
    const mapped = map[hipId.toUpperCase()];
    if (mapped) return mapped;
  }

  const devTenant = process.env["ABDM_DEV_TENANT_ID"]?.trim();
  if (devTenant) return devTenant;

  throw new Error(
    "Cannot resolve callback tenant: set ABDM_HIP_TENANT_MAP or ABDM_DEV_TENANT_ID",
  );
}

/** Correlation id for inbound dedupe — header first, then gateway body echo. */
export function resolveInboundRequestId(
  headers: Record<string, unknown>,
  body?: unknown,
): string {
  const fromHeader = String(
    headers["request-id"] ?? headers["REQUEST-ID"] ?? headers["requestid"] ?? "",
  ).trim();
  if (fromHeader) return fromHeader;

  if (body && typeof body === "object") {
    const b = body as {
      response?: { requestId?: string };
      requestId?: string;
    };
    const fromResponse = b.response?.requestId?.trim();
    if (fromResponse) return fromResponse;
    const fromBody = b.requestId?.trim();
    if (fromBody) return fromBody;
  }

  throw new Error(
    "REQUEST-ID header or body.response.requestId is required on gateway callbacks",
  );
}

/** @deprecated Use {@link resolveInboundRequestId} */
export function headerRequestId(headers: Record<string, unknown>): string {
  return resolveInboundRequestId(headers);
}
