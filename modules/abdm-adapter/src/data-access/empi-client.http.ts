import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import type { EmpiClient } from "../ports.js";

export class HttpEmpiClient implements EmpiClient {
  constructor(private readonly baseUrl: string) {}

  async findPatientByAbhaAddress(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<{ patientId: string; demographics: Record<string, unknown> } | null> {
    if (!this.baseUrl) return null;
    const url = new URL("/api/v1/patients/find", this.baseUrl.replace(/\/+$/, ""));
    url.searchParams.set("abha_address", input.abhaAddress);
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: {
          "x-tenant-id": input.iqTenantId,
          Accept: "application/json",
        },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { patientId?: string; id?: string };
      const patientId = json.patientId ?? json.id;
      if (!patientId) return null;
      return { patientId, demographics: json as Record<string, unknown> };
    } catch {
      return null;
    }
  }

  async findPatientByDemographics(_input: {
    iqTenantId: string;
    identifiers: Array<{ type: string; value: string }>;
  }): Promise<{ patientId: string; score: number } | null> {
    return null;
  }

  async findAbhaAddressByPatientId(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<string | null> {
    if (!this.baseUrl) return null;
    const url = `${this.baseUrl.replace(/\/+$/, "")}/api/v1/patients/${input.patientId}`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: { "x-tenant-id": input.iqTenantId, Accept: "application/json" },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { abhaAddress?: string; abha_address?: string };
      return json.abhaAddress ?? json.abha_address ?? null;
    } catch {
      return null;
    }
  }
}

export class NoOpEmpiClient implements EmpiClient {
  async findPatientByAbhaAddress(): Promise<null> {
    return null;
  }

  async findPatientByDemographics(): Promise<null> {
    return null;
  }

  async findAbhaAddressByPatientId(): Promise<null> {
    return null;
  }
}
