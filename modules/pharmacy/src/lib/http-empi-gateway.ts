import type { EmpiGatewayPort } from "../ports.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export class HttpEmpiGateway implements EmpiGatewayPort {
  constructor(
    private readonly baseUrl: string,
    private readonly options?: {
      warn?: (detail: Record<string, unknown>, message: string) => void;
    },
  ) {}

  async getPatientSummary(
    tenantId: string,
    patientId: string,
    bearerToken?: string,
  ): Promise<Record<string, unknown> | null> {
    const url = joinUrl(this.baseUrl, `/api/empi/v1/patients/${encodeURIComponent(patientId)}`);
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
      this.options?.warn?.({ tenantId, patientId, message }, "EMPI patient fetch failed");
      throw error;
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      this.options?.warn?.(
        { tenantId, patientId, status: response.status, body },
        "EMPI patient fetch rejected",
      );
      return null;
    }

    return (await response.json()) as Record<string, unknown>;
  }
}
