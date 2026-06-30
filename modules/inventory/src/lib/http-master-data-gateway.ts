import type { MasterDataStoreType } from "../domain/store.types.js";
import type { MasterDataGatewayPort } from "../ports.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function mapStoreType(payload: Record<string, unknown>): MasterDataStoreType | null {
  const id = payload["id"];
  const code = payload["code"];
  const name = payload["name"];
  if (typeof id !== "string" || typeof code !== "string" || typeof name !== "string") {
    return null;
  }
  return {
    id,
    code,
    name,
    is_active: Boolean(payload["is_active"]),
    can_receive_stock: Boolean(payload["can_receive_stock"]),
    can_dispense: Boolean(payload["can_dispense"]),
    can_issue_to_ward: Boolean(payload["can_issue_to_ward"]),
    track_batch_expiry: Boolean(payload["track_batch_expiry"]),
    indent_authority: Boolean(payload["indent_authority"]),
  };
}

export class HttpMasterDataGateway implements MasterDataGatewayPort {
  constructor(
    private readonly baseUrl: string,
    private readonly options?: {
      warn?: (detail: Record<string, unknown>, message: string) => void;
    },
  ) {}

  async getStoreTypeById(
    tenantId: string,
    storeTypeId: string,
    bearerToken?: string,
  ): Promise<MasterDataStoreType | null> {
    const url = joinUrl(
      this.baseUrl,
      `/api/v1/master-data/inventory/store-types/${encodeURIComponent(storeTypeId)}`,
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
      this.options?.warn?.({ tenantId, storeTypeId, message }, "Master Data store type fetch failed");
      throw error;
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      this.options?.warn?.(
        { tenantId, storeTypeId, status: response.status, body: body.slice(0, 500) },
        "Master Data store type fetch rejected",
      );
      return null;
    }

    const payload = (await response.json()) as { data?: Record<string, unknown> };
    if (!payload.data) {
      return null;
    }
    const mapped = mapStoreType(payload.data);
    if (!mapped?.is_active) {
      return null;
    }
    return mapped;
  }
}
