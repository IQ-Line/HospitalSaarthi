import type { TenantIntegrationProfile } from "../../../lib/integration-context.js";
import type { IntegrationProfileRepo } from "../../../lib/integration-profile-repo.js";
import { abdmWarn } from "./abdm-adapter-log.js";
import { nodeEnv } from "./abdm-runtime-env.js";

export interface ResolvedCallbackTenant {
  iqTenantId: string;
  /** Set when resolved via HIP lookup (avoids second configurator HTTP call). */
  profile?: TenantIntegrationProfile;
}

/**
 * Maps inbound gateway callbacks to tenant + optional profile.
 * Order: `x-tenant-id` header → DB lookup by `X-HIP-ID` → `ABDM_DEV_TENANT_ID` (dev only).
 */
export async function resolveCallbackTenant(
  headers: Record<string, unknown>,
  profiles: IntegrationProfileRepo,
): Promise<ResolvedCallbackTenant> {
  const fromTenantHeader = String(
    headers["x-tenant-id"] ??
      headers["X-Tenant-Id"] ??
      headers["iq_tenant_id"] ??
      headers["IQ-Tenant-Id"] ??
      "",
  ).trim();
  if (fromTenantHeader) {
    return { iqTenantId: fromTenantHeader };
  }

  const hipId = String(headers["x-hip-id"] ?? headers["X-HIP-ID"] ?? "").trim();
  if (hipId) {
    const profile = await profiles.findActiveByHipId(hipId);
    if (profile) {
      return { iqTenantId: profile.iqTenantId, profile };
    }
  }

  const env = nodeEnv();
  if (env === "production" || env === "staging") {
    throw new Error(
      hipId
        ? `No active integration profile for HIP ${hipId}`
        : "Cannot resolve callback tenant: x-tenant-id or X-HIP-ID required",
    );
  }

  const devTenant = process.env["ABDM_DEV_TENANT_ID"]?.trim();
  if (devTenant) {
    abdmWarn("abdm.callback.dev_tenant_fallback", { hipId: hipId || null });
    return { iqTenantId: devTenant };
  }

  throw new Error(
    "Cannot resolve callback tenant: seed tenant_integration_profiles for HIP or set ABDM_DEV_TENANT_ID (dev only)",
  );
}

/** Returns tenant id only — prefer {@link resolveCallbackTenant} when building deps. */
export async function resolveCallbackTenantId(
  headers: Record<string, unknown>,
  profiles: IntegrationProfileRepo,
): Promise<string> {
  const resolved = await resolveCallbackTenant(headers, profiles);
  return resolved.iqTenantId;
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
