import type { MasterDataGatewayPort } from "../ports.js";
import { truncateUpstreamBody } from "./upstream-log.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export class HttpMasterDataGateway implements MasterDataGatewayPort {
  constructor(
    private readonly baseUrl: string,
    private readonly options?: {
      warn?: (detail: Record<string, unknown>, message: string) => void;
    },
  ) {}

  async getMedicineById(
    tenantId: string,
    medicineId: string,
    bearerToken?: string,
  ): Promise<Record<string, unknown> | null> {
    const url = joinUrl(
      this.baseUrl,
      `/api/v1/master-data/visitpad/medicines/${encodeURIComponent(medicineId)}`,
    );
    const headers: Record<string, string> = {
      iq_tenant_id: tenantId,
      "x-tenant-id": tenantId,
    };
    if (bearerToken?.trim()) {
      headers.Authorization = `Bearer ${bearerToken.trim()}`;
    }

    let response: Response;
    try {
      response = await fetch(url, { method: "GET", headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options?.warn?.({ tenantId, medicineId, message }, "Master Data medicine fetch failed");
      throw error;
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      this.options?.warn?.(
        { tenantId, medicineId, status: response.status, body: truncateUpstreamBody(body) },
        "Master Data medicine fetch rejected",
      );
      return null;
    }

    const payload = (await response.json()) as { data?: Record<string, unknown> };
    return payload.data ?? null;
  }
}
