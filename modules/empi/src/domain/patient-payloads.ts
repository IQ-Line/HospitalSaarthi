import type { CreatePatientData, UpdatePatientData } from "./patient.types.js";

function omitUndefinedAndKeys(
  obj: Record<string, unknown>,
  omit: readonly string[],
): Record<string, unknown> {
  const drop = new Set(omit);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (drop.has(k)) continue;
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Registration body fields stored on `patient_source_records.demographics_snapshot` (no tenant / provenance keys). */
export function demographicsSnapshotFromCreatePayload(
  data: CreatePatientData,
): Record<string, unknown> {
  return omitUndefinedAndKeys(data as unknown as Record<string, unknown>, [
    "iq_tenant_id",
    "force_create",
    "source_system",
    "source_reference",
  ]);
}

/** PATCH demographic fields only (excludes audit / provenance keys on the source row). */
export function demographicsSnapshotFromUpdatePayload(
  data: UpdatePatientData,
): Record<string, unknown> {
  return omitUndefinedAndKeys(data as unknown as Record<string, unknown>, [
    "updated_by",
    "source_system",
  ]);
}
