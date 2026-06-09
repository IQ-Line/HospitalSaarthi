import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import { abdmWarn } from "../lib/abdm-adapter-log.js";
import { EmpiClientError } from "../lib/empi-client-error.js";
import { parseEmpiPatientDetail } from "../lib/parse-empi-m2-patient.js";
import type { EmpiClient, M2PatientProfile } from "../ports.js";

const EMPI_API_PREFIX =
  process.env["EMPI_API_PREFIX"]?.trim().replace(/\/+$/, "") || "/api/empi/v1";

function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

function isServerOrUnavailable(status: number): boolean {
  return status >= 500;
}

export class HttpEmpiClient implements EmpiClient {
  constructor(private readonly baseUrl: string) {}

  async findPatientByAbhaAddress(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<{ patientId: string; demographics: Record<string, unknown> } | null> {
    if (!this.baseUrl) return null;
    const url = new URL(`${EMPI_API_PREFIX}/patients/find`, this.baseUrl.replace(/\/+$/, ""));
    url.searchParams.set("abha_address", input.abhaAddress);
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: {
          "x-tenant-id": input.iqTenantId,
          Accept: "application/json",
        },
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        abdmWarn("abdm.empi.find_by_abha_failed", {
          status: res.status,
          abhaAddress: input.abhaAddress,
        });
        if (isClientError(res.status)) return null;
        if (isServerOrUnavailable(res.status)) {
          throw new EmpiClientError(`EMPI find by ABHA failed: HTTP ${res.status}`, res.status);
        }
        return null;
      }
      const json = (await res.json()) as { patientId?: string; id?: string };
      const patientId = json.patientId ?? json.id;
      if (!patientId) return null;
      return { patientId, demographics: json as Record<string, unknown> };
    } catch (e) {
      if (e instanceof EmpiClientError) throw e;
      abdmWarn("abdm.empi.find_by_abha_error", {
        abhaAddress: input.abhaAddress,
        message: e instanceof Error ? e.message : String(e),
      });
      throw new EmpiClientError(
        e instanceof Error ? e.message : "EMPI find by ABHA network error",
      );
    }
  }

  async findPatientByDemographics(input: {
    iqTenantId: string;
    identifiers: Array<{ type: string; value: string }>;
  }): Promise<{ patientId: string; score: number } | null> {
    if (!this.baseUrl) return null;
    const url = new URL(
      `${EMPI_API_PREFIX}/patients/find-by-demographics`,
      this.baseUrl.replace(/\/+$/, ""),
    );
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": input.iqTenantId,
          Accept: "application/json",
        },
        body: JSON.stringify({ identifiers: input.identifiers }),
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        abdmWarn("abdm.empi.find_by_demographics_failed", { status: res.status });
        if (isClientError(res.status)) return null;
        if (isServerOrUnavailable(res.status)) {
          throw new EmpiClientError(
            `EMPI find-by-demographics failed: HTTP ${res.status}`,
            res.status,
          );
        }
        return null;
      }
      const json = (await res.json()) as {
        patientId?: string;
        id?: string;
        score?: number;
      };
      const patientId = json.patientId ?? json.id;
      if (!patientId) return null;
      return { patientId, score: json.score ?? 1 };
    } catch (e) {
      if (e instanceof EmpiClientError) throw e;
      abdmWarn("abdm.empi.find_by_demographics_error", {
        message: e instanceof Error ? e.message : String(e),
      });
      throw new EmpiClientError(
        e instanceof Error ? e.message : "EMPI find-by-demographics network error",
      );
    }
  }

  async findAbhaAddressByPatientId(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<string | null> {
    const profile = await this.findM2PatientProfile(input);
    return profile?.abhaAddress ?? null;
  }

  async findM2PatientProfile(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<M2PatientProfile | null> {
    if (!this.baseUrl) return null;
    const url = `${this.baseUrl.replace(/\/+$/, "")}${EMPI_API_PREFIX}/patients/${input.patientId}`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: { "x-tenant-id": input.iqTenantId, Accept: "application/json" },
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        if (isClientError(res.status)) return null;
        if (isServerOrUnavailable(res.status)) {
          throw new EmpiClientError(`EMPI get patient failed: HTTP ${res.status}`, res.status);
        }
        return null;
      }
      const json = (await res.json()) as Parameters<typeof parseEmpiPatientDetail>[0];
      return parseEmpiPatientDetail(json);
    } catch (e) {
      if (e instanceof EmpiClientError) throw e;
      throw new EmpiClientError(
        e instanceof Error ? e.message : "EMPI get patient network error",
      );
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

  async findM2PatientProfile(): Promise<null> {
    return null;
  }
}
