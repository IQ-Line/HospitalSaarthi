import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import { abdmWarn } from "../lib/abdm-adapter-log.js";
import { stripTrailingSlashes } from "../lib/http-url.js";
import type { M2PatientProfile, RegistrationClient } from "../ports.js";

const REGISTRATION_API_PREFIX = "/api/registration/v1";
const REGISTRATION_INTERNAL_KEY_HEADER = "x-registration-internal-key";

function registrationInternalHeaders(iqTenantId: string): Record<string, string> {
  const headers: Record<string, string> = {
    "x-tenant-id": iqTenantId,
    iq_tenant_id: iqTenantId,
    Accept: "application/json",
  };
  const internalKey = process.env["REGISTRATION_INTERNAL_API_KEY"]?.trim();
  if (internalKey) {
    headers[REGISTRATION_INTERNAL_KEY_HEADER] = internalKey;
  }
  return headers;
}

function mapGender(gender: string | null | undefined): M2PatientProfile["gender"] {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m") return "M";
  if (g === "female" || g === "f") return "F";
  return "O";
}

export class HttpRegistrationClient implements RegistrationClient {
  constructor(private readonly baseUrl: string) {}

  async findM2PatientProfile(input: {
    iqTenantId: string;
    patientId: string;
  }): Promise<M2PatientProfile | null> {
    if (!this.baseUrl) return null;
    const base = stripTrailingSlashes(this.baseUrl);
    const url = `${base}${REGISTRATION_API_PREFIX}/internal/patients/${input.patientId}/m2-profile`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: registrationInternalHeaders(input.iqTenantId),
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        abdmWarn("abdm.registration.find_m2_profile_failed", {
          status: res.status,
          patientId: input.patientId,
        });
        return null;
      }
      const json = (await res.json()) as {
        abhaAddress?: string;
        abhaNumber?: string | null;
        patientName?: string;
        gender?: string;
        yearOfBirth?: number;
        phoneNo?: string | null;
      };
      if (
        !json.abhaAddress ||
        !json.patientName ||
        !json.gender ||
        typeof json.yearOfBirth !== "number"
      ) {
        return null;
      }
      return {
        abhaAddress: json.abhaAddress,
        abhaNumber: json.abhaNumber?.trim() || undefined,
        patientName: json.patientName,
        gender: mapGender(json.gender),
        yearOfBirth: json.yearOfBirth,
        phoneNo: json.phoneNo?.trim() || undefined,
      };
    } catch (e) {
      abdmWarn("abdm.registration.find_m2_profile_error", {
        patientId: input.patientId,
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  }

  async findPatientIdByAbhaAddress(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<string | null> {
    const ids = await this.findAllPatientIdsByAbhaAddress(input);
    if (ids.length > 0) return ids[0]!;
    return this.resolveSinglePatientIdByAbha(input);
  }

  async findAllPatientIdsByAbhaAddress(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<string[]> {
    if (!this.baseUrl) return [];
    const abhaAddress = input.abhaAddress.trim();
    if (!abhaAddress) return [];
    const base = stripTrailingSlashes(this.baseUrl);
    const url = `${base}${REGISTRATION_API_PREFIX}/internal/patients/patient-ids-by-abha?${new URLSearchParams({ abha_address: abhaAddress }).toString()}`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: registrationInternalHeaders(input.iqTenantId),
      });
      if (res.status === 404) {
        const single = await this.resolveSinglePatientIdByAbha(input);
        return single ? [single] : [];
      }
      if (!res.ok) {
        abdmWarn("abdm.registration.patient_ids_by_abha_failed", {
          status: res.status,
          abhaAddress,
        });
        const single = await this.resolveSinglePatientIdByAbha(input);
        return single ? [single] : [];
      }
      const json = (await res.json()) as { patientIds?: string[] };
      const ids = [...new Set((json.patientIds ?? []).map((id) => id.trim()).filter(Boolean))];
      if (ids.length > 0) return ids;
      const single = await this.resolveSinglePatientIdByAbha(input);
      return single ? [single] : [];
    } catch (e) {
      abdmWarn("abdm.registration.patient_ids_by_abha_error", {
        abhaAddress,
        message: e instanceof Error ? e.message : String(e),
      });
      const single = await this.resolveSinglePatientIdByAbha(input);
      return single ? [single] : [];
    }
  }

  private async resolveSinglePatientIdByAbha(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<string | null> {
    if (!this.baseUrl) return null;
    const abhaAddress = input.abhaAddress.trim();
    if (!abhaAddress) return null;
    const base = stripTrailingSlashes(this.baseUrl);
    const url = `${base}${REGISTRATION_API_PREFIX}/internal/patients/resolve-by-abha?${new URLSearchParams({ abha_address: abhaAddress }).toString()}`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: registrationInternalHeaders(input.iqTenantId),
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        abdmWarn("abdm.registration.resolve_by_abha_failed", {
          status: res.status,
          abhaAddress,
        });
        return null;
      }
      const json = (await res.json()) as { patientId?: string };
      const patientId = json.patientId?.trim();
      return patientId || null;
    } catch (e) {
      abdmWarn("abdm.registration.resolve_by_abha_error", {
        abhaAddress,
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  }
}

export class NoOpRegistrationClient implements RegistrationClient {
  async findM2PatientProfile(): Promise<null> {
    return null;
  }

  async findPatientIdByAbhaAddress(): Promise<null> {
    return null;
  }

  async findAllPatientIdsByAbhaAddress(): Promise<string[]> {
    return [];
  }
}
