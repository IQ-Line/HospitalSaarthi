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
