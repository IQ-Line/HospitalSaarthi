/**
 * Maps inbound `X-HIP-ID` → `iq_tenant_id` for multi-HIP deployments.
 * `ABDM_HIP_TENANT_MAP` JSON example: `{"IN3610001625":"00000000-0000-4000-8000-0000000000aa"}`
 */
export function parseHipTenantMap(): Record<string, string> {
  const raw = process.env["ABDM_HIP_TENANT_MAP"]?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [hipId, tenantId] of Object.entries(parsed)) {
      if (typeof tenantId === "string" && tenantId.trim()) {
        out[hipId.trim().toUpperCase()] = tenantId.trim();
      }
    }
    return out;
  } catch {
    throw new Error("ABDM_HIP_TENANT_MAP must be valid JSON object of hipId → iqTenantId");
  }
}
