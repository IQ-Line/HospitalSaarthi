import type { IntegrationProfileRepo } from "../../../lib/integration-profile-repo.js";
import { abdmWarn } from "./abdm-adapter-log.js";

/**
 * Maps inbound gateway callbacks to `iq_tenant_id`.
 * Order: `x-tenant-id` header → DB lookup by `X-HIP-ID` → `ABDM_DEV_TENANT_ID` (dev fallback).
 */
export async function resolveCallbackTenantId(
  headers: Record<string, unknown>,
  profiles: IntegrationProfileRepo,
): Promise<string> {
  const fromTenantHeader = String(
    headers["x-tenant-id"] ??
      headers["X-Tenant-Id"] ??
      headers["iq_tenant_id"] ??
      headers["IQ-Tenant-Id"] ??
      "",
  ).trim();
  if (fromTenantHeader) return fromTenantHeader;

  const hipId = String(headers["x-hip-id"] ?? headers["X-HIP-ID"] ?? "").trim();
  if (hipId) {
    const profile = await profiles.findActiveByHipId(hipId);
    if (profile) return profile.iqTenantId;
  }

  const devTenant = process.env["ABDM_DEV_TENANT_ID"]?.trim();
  if (devTenant) {
    abdmWarn("abdm.callback.dev_tenant_fallback", { hipId: hipId || null });
    return devTenant;
  }

  throw new Error(
    "Cannot resolve callback tenant: seed tenant_integration_profiles for HIP or set ABDM_DEV_TENANT_ID",
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
