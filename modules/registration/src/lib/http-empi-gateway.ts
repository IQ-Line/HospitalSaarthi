import type { EmpiHttpPort } from "../ports.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export class HttpEmpiGateway implements EmpiHttpPort {
  constructor(private readonly empiServiceOrigin: string) {}

  private tenantHeaders(tenantId: string): Record<string, string> {
    return { iq_tenant_id: tenantId };
  }

  private jsonHeaders(tenantId: string): Record<string, string> {
    return { ...this.tenantHeaders(tenantId), "Content-Type": "application/json" };
  }

  async registerPatient(
    tenantId: string,
    body: Record<string, unknown>,
  ): Promise<
    | { ok: true; patientId: string }
    | { ok: false; status: 409; body: unknown }
    | { ok: false; status: number; body: string }
  > {
    const url = joinUrl(this.empiServiceOrigin, "/api/empi/v1/patients");
    const res = await fetch(url, {
      method: "POST",
      headers: this.jsonHeaders(tenantId),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (res.status === 201) {
      const json = JSON.parse(text) as { id?: string };
      if (!json.id) {
        return { ok: false, status: 502, body: "EMPI create patient: missing id" };
      }
      return { ok: true, patientId: json.id };
    }
    if (res.status === 409) {
      try {
        return { ok: false, status: 409, body: JSON.parse(text) as unknown };
      } catch {
        return { ok: false, status: 409, body: text };
      }
    }
    return { ok: false, status: res.status, body: text };
  }

  async searchPatientIds(
    tenantId: string,
    filters: { uhid?: string; mobile?: string; name?: string },
  ): Promise<string[]> {
    const params = new URLSearchParams();
    if (filters.uhid?.trim()) params.set("uhid", filters.uhid.trim());
    if (filters.mobile?.trim()) params.set("phone", filters.mobile.trim());
    if (filters.name?.trim()) params.set("name", filters.name.trim());
    params.set("limit", "100");

    const collected = new Set<string>();
    let page = 1;
    let totalPages = 1;

    do {
      params.set("page", String(page));
      const url = `${joinUrl(this.empiServiceOrigin, "/api/empi/v1/patients")}?${params.toString()}`;
      const res = await fetch(url, { headers: this.tenantHeaders(tenantId) });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`EMPI search failed (${res.status}): ${text}`);
      }
      const json = JSON.parse(text) as {
        data?: { id: string }[];
        total_pages?: number;
      };
      totalPages = json.total_pages ?? 1;
      for (const row of json.data ?? []) {
        collected.add(row.id);
      }
      page++;
    } while (page <= totalPages && page <= 50);

    return [...collected];
  }

  async getPatientSummary(
    tenantId: string,
    patientId: string,
  ): Promise<{
    uhid: string;
    full_name: string;
    phone_number: string;
  } | null> {
    const url = joinUrl(this.empiServiceOrigin, `/api/empi/v1/patients/${patientId}`);
    const res = await fetch(url, { headers: this.tenantHeaders(tenantId) });
    if (res.status === 404) return null;
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`EMPI get patient failed (${res.status}): ${text}`);
    }
    const json = JSON.parse(text) as {
      patient?: { uhid: string; full_name: string; phone_number: string };
    };
    const p = json.patient;
    if (!p) return null;
    return {
      uhid: p.uhid,
      full_name: p.full_name,
      phone_number: p.phone_number,
    };
  }
}
