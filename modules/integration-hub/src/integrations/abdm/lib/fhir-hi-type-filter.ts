const HI_TYPE_TO_BUNDLE_TYPE: Record<string, string[]> = {
  Prescription: ["PrescriptionRecord", "MedicationRequest"],
  DiagnosticReport: ["DiagnosticReportRecord", "DiagnosticReport"],
  DischargeSummary: ["DischargeSummaryRecord"],
  ImmunizationRecord: ["ImmunizationRecord", "Immunization"],
  HealthDocumentRecord: ["HealthDocumentRecord", "DocumentReference"],
  WellnessRecord: ["WellnessRecord"],
  OPConsultation: ["OPConsultRecord", "Encounter"],
};

/** HI types covered by {@link HI_TYPE_TO_BUNDLE_TYPE} — used when session grants all record families. */
export const M3_FILTERABLE_HI_TYPES = Object.keys(HI_TYPE_TO_BUNDLE_TYPE);

function allHiTypesSelected(sessionHiTypes: string[]): boolean {
  return M3_FILTERABLE_HI_TYPES.every((hiType) => sessionHiTypes.includes(hiType));
}

export function mapHiTypesToBundleTypes(hiTypes: string[]): string[] {
  const allowed = new Set<string>();
  for (const hiType of hiTypes) {
    for (const bundleType of HI_TYPE_TO_BUNDLE_TYPE[hiType] ?? []) {
      allowed.add(bundleType);
    }
  }
  return [...allowed];
}

export function filterDataPushedEntry<T extends { bundleType?: string }>(
  entry: T,
  sessionHiTypes: string[],
): boolean {
  const bundleType = entry.bundleType;
  if (!bundleType) return true;
  if (bundleType === "Composition" || bundleType === "Bundle") {
    return allHiTypesSelected(sessionHiTypes);
  }
  const allowed = mapHiTypesToBundleTypes(sessionHiTypes);
  if (!allowed.length) return true;
  return allowed.includes(bundleType);
}
