import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import { abdmWarn } from "../lib/abdm-adapter-log.js";
import type { M2PatientProfile, RegistrationClient } from "../ports.js";

const REGISTRATION_API_PREFIX = "/api/registration/v1";

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
    const base = this.baseUrl.replace(/\/+$/, "");
    const url = `${base}${REGISTRATION_API_PREFIX}/internal/patients/${input.patientId}/m2-profile`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: {
          "x-tenant-id": input.iqTenantId,
          iq_tenant_id: input.iqTenantId,
          Accept: "application/json",
        },
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
}

export class NoOpRegistrationClient implements RegistrationClient {
  async findM2PatientProfile(): Promise<null> {
    return null;
  }
}
