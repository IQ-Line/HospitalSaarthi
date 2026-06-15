import type { EmpiHttpPort, EmpiRegisterPatientResult } from "../ports.js";
import type { PatientDemographicsSnapshot } from "../domain/registration.types.js";
import type { EmpiPatientWire } from "./registration-helpers.js";
import { mapEmpiPatientToSnapshot } from "./registration-helpers.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

/** Align with EMPI desk registration (`+91` + 10 digits). */
function normalizeIndianPhoneForEmpi(raw: string | undefined | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `+91${digits.slice(-10)}`;
}

function isPatientWire(value: unknown): value is EmpiPatientWire {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.uhid === "string" &&
    typeof o.full_name === "string" &&
    typeof o.phone_number === "string"
  );
}

function parseRegisterSuccess(json: unknown): {
  patientId: string;
  sourceRecordId: string;
  snapshot: PatientDemographicsSnapshot;
} {
  const root = json as Record<string, unknown>;

  if (root.patient && isPatientWire(root.patient)) {
    // TODO(empi-contract): drop fallback once EMPI returns patient_source_record_id on create
    // (HospitalSaarthi#12 — honor Idempotency-Key on POST /patients).
    const sourceRecordId =
      typeof root.patient_source_record_id === "string"
        ? root.patient_source_record_id
        : root.patient.id;
    return mapEmpiPatientToSnapshot(root.patient, sourceRecordId);
  }

  if (isPatientWire(json)) {
    const sourceRecordId =
      typeof root.patient_source_record_id === "string"
        ? root.patient_source_record_id
        : json.id;
    return mapEmpiPatientToSnapshot(json, sourceRecordId);
  }

  if (typeof root.id === "string") {
    throw new Error("EMPI create patient: response missing demographics (contract upgrade pending)");
  }

  throw new Error("EMPI create patient: unrecognised response shape");
}

function parseDuplicate(
  json: unknown,
  warn?: (detail: Record<string, unknown>, message: string) => void,
): Extract<EmpiRegisterPatientResult, { ok: false; kind: "duplicate" }> {
  const root = json as Record<string, unknown>;
  const existing = root.existing_patient;
  if (root.potential_duplicate === true && isPatientWire(existing)) {
    const mapped = mapEmpiPatientToSnapshot(existing, existing.id);
    return {
      ok: false,
      kind: "duplicate",
      existingPatientId: mapped.patientId,
      sourceRecordId: mapped.sourceRecordId,
      snapshot: mapped.snapshot,
      body: json,
    };
  }
  warn?.({ body: json }, "EMPI 409: unrecognised duplicate body shape");
  return {
    ok: false,
    kind: "duplicate",
    existingPatientId: "",
    sourceRecordId: "",
    snapshot: {
      uhid: "",
      full_name: "",
      phone_number: "",
    },
    body: json,
  };
}

export type EmpiGatewayLog = {
  warn: (detail: Record<string, unknown>, message: string) => void;
};

export class HttpEmpiGateway implements EmpiHttpPort {
  constructor(
    private readonly empiServiceOrigin: string,
    private readonly log?: EmpiGatewayLog,
  ) {}

  private jsonHeaders(tenantId: string, idempotencyKey: string, bearerToken?: string): Record<string, string> {
    const h: Record<string, string> = {
      iq_tenant_id: tenantId,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    };
    if (bearerToken) {
      h["Authorization"] = `Bearer ${bearerToken}`;
    }
    return h;
  }

  async registerPatient(
    tenantId: string,
    idempotencyKey: string,
    body: Record<string, unknown>,
    bearerToken?: string,
  ): Promise<EmpiRegisterPatientResult> {
    const url = joinUrl(this.empiServiceOrigin, "/api/empi/v1/patients");

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: this.jsonHeaders(tenantId, idempotencyKey, bearerToken),
        body: JSON.stringify(body),
      });
    } catch (err) {
      return {
        ok: false,
        kind: "empi_unavailable",
        status: 503,
        body: err instanceof Error ? err.message : "EMPI unreachable",
      };
    }

    const text = await res.text();

    if (res.status === 201 || res.status === 200) {
      try {
        const json = JSON.parse(text) as unknown;
        return { ok: true, ...parseRegisterSuccess(json) };
      } catch (err) {
        return {
          ok: false,
          kind: "error",
          status: 502,
          body: err instanceof Error ? err.message : "EMPI response parse failed",
        };
      }
    }

    if (res.status === 409) {
      try {
        return parseDuplicate(JSON.parse(text) as unknown, this.log?.warn.bind(this.log));
      } catch {
        return {
          ok: false,
          kind: "error",
          status: 409,
          body: text,
        };
      }
    }

    return { ok: false, kind: "error", status: res.status, body: text };
  }

  async linkAbhaAddress(
    tenantId: string,
    patientId: string,
    abhaAddress: string,
    actorId?: string,
    bearerToken?: string,
  ): Promise<{ ok: true } | { ok: false; reason: "conflict" | "error"; status: number }> {
    const value = abhaAddress.trim();
    if (!value) return { ok: true };

    const url = joinUrl(
      this.empiServiceOrigin,
      `/api/empi/v1/patients/${encodeURIComponent(patientId)}/identifiers`,
    );

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          ...this.tenantHeaders(tenantId, bearerToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier_type: "abha_address",
          identifier_value: value,
          issuing_system: "abdm",
          created_by: actorId,
        }),
      });
    } catch {
      return { ok: false, reason: "error", status: 503 };
    }

    if (res.status === 201 || res.status === 200) return { ok: true };
    if (res.status === 409) return { ok: false, reason: "conflict", status: 409 };
    return { ok: false, reason: "error", status: res.status };
  }

  private tenantHeaders(tenantId: string, bearerToken?: string): Record<string, string> {
    const h: Record<string, string> = { iq_tenant_id: tenantId };
    if (bearerToken) {
      h["Authorization"] = `Bearer ${bearerToken}`;
    }
    return h;
  }

  private async fetchFirstPatientId(
    tenantId: string,
    path: string,
    bearerToken?: string,
  ): Promise<string | null> {
    const url = joinUrl(this.empiServiceOrigin, path);
    let res: Response;
    try {
      res = await fetch(url, { headers: this.tenantHeaders(tenantId, bearerToken) });
    } catch {
      return null;
    }
    if (!res.ok) return null;

    try {
      const json = (await res.json()) as Record<string, unknown>;
      if (typeof json.patientId === "string" && json.patientId) return json.patientId;
      if (typeof json.id === "string" && json.id) return json.id;
      const patient = json.patient;
      if (patient && typeof patient === "object") {
        const pid = (patient as Record<string, unknown>).id;
        if (typeof pid === "string" && pid) return pid;
      }
      const data = json.data;
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0] as Record<string, unknown>;
        if (typeof first.id === "string" && first.id) return first.id;
      }
    } catch {
      return null;
    }
    return null;
  }

  async fetchPatientDetail(
    tenantId: string,
    patientId: string,
    bearerToken?: string,
  ): Promise<{ patient: EmpiPatientWire; abha_number?: string | null; abha_address?: string | null } | null> {
    const url = joinUrl(
      this.empiServiceOrigin,
      `/api/empi/v1/patients/${encodeURIComponent(patientId.trim())}`,
    );
    let res: Response;
    try {
      res = await fetch(url, { headers: this.tenantHeaders(tenantId, bearerToken) });
    } catch {
      return null;
    }
    if (!res.ok) return null;

    try {
      const json = (await res.json()) as Record<string, unknown>;
      const patientRaw = json.patient ?? json;
      if (!isPatientWire(patientRaw)) return null;

      let abhaNumber: string | null = patientRaw.abha_number?.trim() || null;
      let abhaAddress: string | null = patientRaw.abha_address?.trim() || null;
      const identifiers = json.identifiers;
      if (Array.isArray(identifiers)) {
        for (const item of identifiers) {
          if (!item || typeof item !== "object") continue;
          const row = item as Record<string, unknown>;
          const value = typeof row.identifier_value === "string" ? row.identifier_value.trim() : "";
          if (!value) continue;
          if (row.identifier_type === "abha_address" && !abhaAddress) {
            abhaAddress = value;
          }
        }
      }

      return { patient: patientRaw, abha_number: abhaNumber, abha_address: abhaAddress };
    } catch {
      return null;
    }
  }

  private async fetchPatientIdFromDemographicsDedup(
    tenantId: string,
    body: Record<string, unknown>,
    bearerToken?: string,
  ): Promise<string | null> {
    const url = joinUrl(this.empiServiceOrigin, "/api/empi/v1/patients/find-by-demographics");
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          ...this.tenantHeaders(tenantId, bearerToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch {
      return null;
    }
    if (res.status === 404) return null;
    if (!res.ok) return null;

    try {
      const json = (await res.json()) as Record<string, unknown>;
      if (typeof json.patientId === "string" && json.patientId) return json.patientId;
      if (typeof json.id === "string" && json.id) return json.id;
    } catch {
      return null;
    }
    return null;
  }

  async resolvePatientId(
    tenantId: string,
    query: {
      patient_id?: string;
      uhid?: string;
      abha_number?: string;
      abha_address?: string;
      phone_number?: string;
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      gender?: string;
      date_of_birth?: string;
      age_years?: number;
      age_months?: number;
      age_days?: number;
    },
    bearerToken?: string,
  ): Promise<string | null> {
    const directId = query.patient_id?.trim();
    if (directId) {
      const byId = await this.fetchFirstPatientId(
        tenantId,
        `/api/empi/v1/patients/${encodeURIComponent(directId)}`,
        bearerToken,
      );
      if (byId) return byId;
    }

    const uhid = query.uhid?.trim();
    if (uhid) {
      const match = await this.fetchFirstPatientId(
        tenantId,
        `/api/empi/v1/patients?${new URLSearchParams({ uhid, limit: "1" }).toString()}`,
        bearerToken,
      );
      if (match) return match;
    }

    const abhaNumber = query.abha_number?.trim();
    if (abhaNumber) {
      const match = await this.fetchFirstPatientId(
        tenantId,
        `/api/empi/v1/patients?${new URLSearchParams({ abha_number: abhaNumber, limit: "1" }).toString()}`,
        bearerToken,
      );
      if (match) return match;
    }

    const abhaAddress = query.abha_address?.trim();
    if (abhaAddress) {
      const match = await this.fetchFirstPatientId(
        tenantId,
        `/api/empi/v1/patients/find?${new URLSearchParams({ abha_address: abhaAddress }).toString()}`,
        bearerToken,
      );
      if (match) return match;
    }

    const phoneRaw = query.phone_number ?? "";
    const firstName = query.first_name?.trim() ?? "";
    const gender = query.gender?.trim().toLowerCase() ?? "";
    const empiPhone = normalizeIndianPhoneForEmpi(phoneRaw);
    const hasDedupDemographics =
      empiPhone != null &&
      firstName.length >= 1 &&
      (gender === "male" || gender === "female" || gender === "other");

    if (hasDedupDemographics) {
      const dedupBody: Record<string, unknown> = {
        first_name: firstName,
        gender,
        phone_number: empiPhone,
      };
      const middleName = query.middle_name?.trim();
      const lastName = query.last_name?.trim();
      const dob = query.date_of_birth?.trim();
      if (middleName) dedupBody.middle_name = middleName;
      if (lastName) dedupBody.last_name = lastName;
      if (dob) {
        dedupBody.date_of_birth = dob;
        const y = new Date(dob).getFullYear();
        if (!Number.isNaN(y) && y > 1900) dedupBody.year_of_birth = y;
      }
      if (typeof query.age_years === "number" && Number.isFinite(query.age_years)) {
        dedupBody.age_years = query.age_years;
      }
      if (typeof query.age_months === "number" && Number.isFinite(query.age_months)) {
        dedupBody.age_months = query.age_months;
      }
      if (typeof query.age_days === "number" && Number.isFinite(query.age_days)) {
        dedupBody.age_days = query.age_days;
      }

      const match = await this.fetchPatientIdFromDemographicsDedup(
        tenantId,
        dedupBody,
        bearerToken,
      );
      if (match) return match;
    }

    return null;
  }
}
