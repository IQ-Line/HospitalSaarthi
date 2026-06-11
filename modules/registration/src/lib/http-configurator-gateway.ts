import type { ConfiguratorHttpPort } from "../ports.js";
import { normalizeFollowUpConfig, type TenantFollowUpConfig } from "./follow-up.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export class HttpConfiguratorGateway implements ConfiguratorHttpPort {
  constructor(private readonly configuratorServiceOrigin: string) {}

  async getTenantFollowUpConfig(tenantId: string): Promise<TenantFollowUpConfig> {
    const url = joinUrl(
      this.configuratorServiceOrigin,
      `/api/configurator/v1/tenants/${encodeURIComponent(tenantId)}`,
    );

    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { iq_tenant_id: tenantId },
      });
    } catch (err) {
      return normalizeFollowUpConfig(undefined, undefined);
    }

    if (!res.ok) {
      return normalizeFollowUpConfig(undefined, undefined);
    }

    try {
      const json = (await res.json()) as Record<string, unknown>;
      return normalizeFollowUpConfig(json.free_follow_up_days, json.free_follow_up_visits);
    } catch {
      return normalizeFollowUpConfig(undefined, undefined);
    }
  }
}
