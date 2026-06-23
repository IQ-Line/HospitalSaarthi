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

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
  }
  return null;
}

/**
 * Extract a patient id from the assorted shapes EMPI list/get/find endpoints
 * return: top-level `patientId`/`id`, a nested `patient.id`, or the first row
 * of a `data[]` array.
 */
function extractPatientId(json: Record<string, unknown>): string | null {
  const topLevel = firstNonEmptyString(json.patientId, json.id);
  if (topLevel) return topLevel;

  const patient = json.patient;
  if (patient && typeof patient === "object") {
    const nested = firstNonEmptyString((patient as Record<string, unknown>).id);
    if (nested) return nested;
  }

  const data = json.data;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>;
    return firstNonEmptyString(first.id);
  }

  return null;
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

/**
 * Resolve the patient's ABHA address, preferring the value on the patient wire
 * and falling back to the first `abha_address` row in the `identifiers[]` list.
 */
function resolveAbhaAddress(
  patientWireValue: string | null,
  identifiers: unknown,
): string | null {
  if (patientWireValue) return patientWireValue;
  if (!Array.isArray(identifiers)) return null;

  for (const item of identifiers) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (row.identifier_type !== "abha_address") continue;
    const value = typeof row.identifier_value === "string" ? row.identifier_value.trim() : "";
    if (value) return value;
  }
  return null;
}

/** Keep only well-formed address rows, narrowed to the `{ id, address_type }` shape. */
function extractAddresses(raw: unknown): Array<{ id: string; address_type: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is { id: string; address_type: string } => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return typeof row.id === "string" && typeof row.address_type === "string";
    })
    .map((row) => ({ id: row.id, address_type: row.address_type }));
}

export type ResolvePatientIdQuery = {
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
};

/**
 * The ordered list of single-identifier GET paths to try, in priority order:
 * direct id, then UHID, ABHA number, ABHA address. Only present fields produce
 * a path, preserving the original "skip empty, try next" sequencing.
 */
function identifierLookupPaths(query: ResolvePatientIdQuery): string[] {
  const paths: string[] = [];

  const directId = query.patient_id?.trim();
  if (directId) paths.push(`/api/empi/v1/patients/${encodeURIComponent(directId)}`);

  const uhid = query.uhid?.trim();
  if (uhid) {
    paths.push(`/api/empi/v1/patients?${new URLSearchParams({ uhid, limit: "1" }).toString()}`);
  }

  const abhaNumber = query.abha_number?.trim();
  if (abhaNumber) {
    paths.push(
      `/api/empi/v1/patients?${new URLSearchParams({ abha_number: abhaNumber, limit: "1" }).toString()}`,
    );
  }

  const abhaAddress = query.abha_address?.trim();
  if (abhaAddress) {
    paths.push(
      `/api/empi/v1/patients/find?${new URLSearchParams({ abha_address: abhaAddress }).toString()}`,
    );
  }

  return paths;
}

/** A `{ [key]: value }` object when `value` is a finite number, otherwise empty (spread-safe). */
function finiteAgeField(key: string, value: number | undefined): Record<string, number> {
  return typeof value === "number" && Number.isFinite(value) ? { [key]: value } : {};
}

/**
 * Build the find-by-demographics dedup payload, or `null` when the minimum
 * signal (normalisable phone + first name + valid gender) is absent.
 */
function buildDedupBody(query: ResolvePatientIdQuery): Record<string, unknown> | null {
  const firstName = query.first_name?.trim() ?? "";
  const gender = query.gender?.trim().toLowerCase() ?? "";
  const empiPhone = normalizeIndianPhoneForEmpi(query.phone_number ?? "");

  const hasMinimumSignal =
    empiPhone != null &&
    firstName.length >= 1 &&
    (gender === "male" || gender === "female" || gender === "other");
  if (!hasMinimumSignal) return null;

  const body: Record<string, unknown> = { first_name: firstName, gender, phone_number: empiPhone };

  const middleName = query.middle_name?.trim();
  const lastName = query.last_name?.trim();
  if (middleName) body.middle_name = middleName;
  if (lastName) body.last_name = lastName;

  const dob = query.date_of_birth?.trim();
  if (dob) {
    body.date_of_birth = dob;
    const year = new Date(dob).getFullYear();
    if (!Number.isNaN(year) && year > 1900) body.year_of_birth = year;
  }

  return {
    ...body,
    ...finiteAgeField("age_years", query.age_years),
    ...finiteAgeField("age_months", query.age_months),
    ...finiteAgeField("age_days", query.age_days),
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
      return extractPatientId(json);
    } catch {
      return null;
    }
  }

  async fetchPatientDetail(
    tenantId: string,
    patientId: string,
    bearerToken?: string,
  ): Promise<{
    patient: EmpiPatientWire;
    abha_number?: string | null;
    abha_address?: string | null;
    addresses?: Array<{ id: string; address_type: string }>;
  } | null> {
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

      const abhaNumber: string | null = patientRaw.abha_number?.trim() || null;
      const abhaAddress = resolveAbhaAddress(patientRaw.abha_address?.trim() || null, json.identifiers);
      const addresses = extractAddresses(json.addresses);

      return { patient: patientRaw, abha_number: abhaNumber, abha_address: abhaAddress, addresses };
    } catch {
      return null;
    }
  }

  async upsertPermanentAddress(
    tenantId: string,
    patientId: string,
    address: Record<string, unknown>,
    actorId?: string,
    bearerToken?: string,
  ): Promise<void> {
    const detail = await this.fetchPatientDetail(tenantId, patientId, bearerToken);
    if (!detail) {
      this.log?.warn(
        { tenantId, patientId },
        "EMPI upsertPermanentAddress skipped — patient detail not found",
      );
      return;
    }

    const existing =
      detail.addresses?.find((row) => row.address_type === "permanent") ??
      detail.addresses?.[0];

    if (existing?.id) {
      const patchPayload = {
        ...address,
        ...(actorId ? { updated_by: actorId } : {}),
      };
      const url = joinUrl(
        this.empiServiceOrigin,
        `/api/empi/v1/patients/${encodeURIComponent(patientId)}/addresses/${encodeURIComponent(existing.id)}`,
      );
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          ...this.tenantHeaders(tenantId, bearerToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchPayload),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        this.log?.warn(
          { tenantId, patientId, status: res.status, body },
          "EMPI permanent address PATCH failed",
        );
      }
      return;
    }

    const postPayload = {
      ...address,
      ...(actorId ? { created_by: actorId } : {}),
    };
    const url = joinUrl(
      this.empiServiceOrigin,
      `/api/empi/v1/patients/${encodeURIComponent(patientId)}/addresses`,
    );
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.tenantHeaders(tenantId, bearerToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postPayload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.log?.warn(
        { tenantId, patientId, status: res.status, body },
        "EMPI permanent address POST failed",
      );
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
      return firstNonEmptyString(json.patientId, json.id);
    } catch {
      return null;
    }
  }

  async resolvePatientId(
    tenantId: string,
    query: ResolvePatientIdQuery,
    bearerToken?: string,
  ): Promise<string | null> {
    for (const path of identifierLookupPaths(query)) {
      const match = await this.fetchFirstPatientId(tenantId, path, bearerToken);
      if (match) return match;
    }

    const dedupBody = buildDedupBody(query);
    if (dedupBody) {
      const match = await this.fetchPatientIdFromDemographicsDedup(tenantId, dedupBody, bearerToken);
      if (match) return match;
    }

    return null;
  }
}
