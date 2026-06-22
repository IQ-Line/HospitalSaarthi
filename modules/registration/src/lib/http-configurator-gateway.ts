import type { ConfiguratorHttpPort } from "../ports.js";
import { normalizeFollowUpConfig, type TenantFollowUpConfig } from "./follow-up.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export class HttpConfiguratorGateway implements ConfiguratorHttpPort {
  constructor(
    private readonly configuratorServiceOrigin: string,
    private readonly options?: {
      warn?: (detail: Record<string, unknown>, message: string) => void;
    },
  ) {}

  async getTenantFollowUpConfig(tenantId: string): Promise<TenantFollowUpConfig> {
    const url = joinUrl(
      this.configuratorServiceOrigin,
      `/api/configurator/v1/tenants/${encodeURIComponent(tenantId)}`,
    );

    // Degrading to platform defaults is a deliberate resilience choice, but it
    // silently changes a billing-relevant free-follow-up decision — log every
    // fall-through so the degradation is observable, not invisible.
    const degrade = (reason: string, detail: Record<string, unknown> = {}): TenantFollowUpConfig => {
      this.options?.warn?.(
        { tenantId, reason, ...detail },
        "configurator follow-up config unavailable; using platform defaults",
      );
      return normalizeFollowUpConfig(undefined, undefined);
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { iq_tenant_id: tenantId },
      });
    } catch (err) {
      return degrade("fetch_failed", { error: err instanceof Error ? err.message : String(err) });
    }

    if (!res.ok) {
      return degrade("non_ok_status", { status: res.status });
    }

    try {
      const json = (await res.json()) as Record<string, unknown>;
      return normalizeFollowUpConfig(json.free_follow_up_days, json.free_follow_up_visits);
    } catch (err) {
      return degrade("parse_failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}
