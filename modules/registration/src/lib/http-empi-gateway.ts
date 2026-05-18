import type { EmpiHttpPort, EmpiRegisterPatientResult } from "../ports.js";
import type { EmpiPatientWire } from "./registration-helpers.js";
import { mapEmpiPatientToSnapshot } from "./registration-helpers.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
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

function parseRegisterSuccess(json: unknown): Extract<EmpiRegisterPatientResult, { ok: true }> {
  const root = json as Record<string, unknown>;

  if (root.patient && isPatientWire(root.patient)) {
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
        : root.id;
    return mapEmpiPatientToSnapshot(json, sourceRecordId);
  }

  if (typeof root.id === "string") {
    throw new Error("EMPI create patient: response missing demographics (contract upgrade pending)");
  }

  throw new Error("EMPI create patient: unrecognised response shape");
}

function parseDuplicate(json: unknown): Extract<EmpiRegisterPatientResult, { ok: false; kind: "duplicate" }> {
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

export class HttpEmpiGateway implements EmpiHttpPort {
  constructor(private readonly empiServiceOrigin: string) {}

  private jsonHeaders(tenantId: string, idempotencyKey: string): Record<string, string> {
    return {
      iq_tenant_id: tenantId,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    };
  }

  async registerPatient(
    tenantId: string,
    idempotencyKey: string,
    body: Record<string, unknown>,
  ): Promise<EmpiRegisterPatientResult> {
    const url = joinUrl(this.empiServiceOrigin, "/api/empi/v1/patients");
    const res = await fetch(url, {
      method: "POST",
      headers: this.jsonHeaders(tenantId, idempotencyKey),
      body: JSON.stringify(body),
    });
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
        return parseDuplicate(JSON.parse(text) as unknown);
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
}
