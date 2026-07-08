import type { ConsentArtefact } from "@hims/ts-sdk-abha/protocol/m2";

/** LIMS parity — only pass care contexts when hiTypes overlap supported clinical types. */
const SUPPORTED_HI_TYPES = new Set([
  "HealthDocumentRecord",
  "Prescription",
  "OPConsultation",
  "ImmunizationRecord",
  "DiagnosticReport",
]);

export type ConsentCareContextRef = {
  patientReference: string;
  careContextReference: string;
};

/**
 * The ABDM consent artefact carries `careContexts` on the wire, but the SDK's
 * {@link ConsentArtefact} type omits it. This models the field as present-but-
 * unvalidated (consumers re-validate); assigning a plain `ConsentArtefact` to it
 * is a widening, not a cast.
 */
export type ConsentArtefactWithCareContexts = ConsentArtefact & {
  careContexts?: unknown;
};

export function filterConsentCareContexts(input: {
  hiTypes: string[];
  careContexts: unknown;
}): ConsentCareContextRef[] {
  const requested = input.hiTypes.filter(Boolean);
  if (requested.length === 0) return [];
  if (!requested.some((type) => SUPPORTED_HI_TYPES.has(type))) {
    return [];
  }

  if (!Array.isArray(input.careContexts)) return [];

  const out: ConsentCareContextRef[] = [];
  for (const item of input.careContexts) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const patientReference = String(row.patientReference ?? "").trim();
    const careContextReference = String(row.careContextReference ?? "").trim();
    if (!patientReference || !careContextReference) continue;
    out.push({ patientReference, careContextReference });
  }
  return out;
}
