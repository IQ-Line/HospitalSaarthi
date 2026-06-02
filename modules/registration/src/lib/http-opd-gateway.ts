import type { OpdHttpPort } from "../ports.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export class HttpOpdGateway implements OpdHttpPort {
  constructor(
    private readonly baseUrl: string,
    private readonly options?: {
      warn?: (detail: Record<string, unknown>, message: string) => void;
    },
  ) {}

  async ensureEncounter(
    tenantId: string,
    visitId: string,
    patientId: string,
    bearerToken?: string,
    doctorId?: string | null,
  ): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
    const url = joinUrl(
      this.baseUrl,
      `/api/v1/opd/visits/${encodeURIComponent(visitId)}/encounter`,
    );
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      iq_tenant_id: tenantId,
      "x-tenant-id": tenantId,
    };
    if (bearerToken?.trim()) {
      headers.Authorization = `Bearer ${bearerToken.trim()}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          patient_id: patientId,
          ...(doctorId?.trim() ? { doctor_id: doctorId.trim() } : {}),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options?.warn?.({ tenantId, visitId, patientId, message }, "OPD ensure encounter failed");
      return { ok: false, status: 503, body: message };
    }

    if (!response.ok) {
      const body = await response.text();
      this.options?.warn?.(
        { tenantId, visitId, patientId, status: response.status, body },
        "OPD ensure encounter rejected",
      );
      return { ok: false, status: response.status, body };
    }

    return { ok: true };
  }
}
