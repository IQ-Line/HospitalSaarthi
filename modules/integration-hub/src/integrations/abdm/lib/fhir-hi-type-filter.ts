const HI_TYPE_TO_BUNDLE_TYPE: Record<string, string[]> = {
  Prescription: ["PrescriptionRecord", "MedicationRequest"],
  DiagnosticReport: ["DiagnosticReportRecord", "DiagnosticReport"],
  DischargeSummary: ["DischargeSummaryRecord"],
  ImmunizationRecord: ["ImmunizationRecord", "Immunization"],
  HealthDocumentRecord: ["HealthDocumentRecord", "DocumentReference"],
  WellnessRecord: ["WellnessRecord"],
  OPConsultation: ["OPConsultRecord", "Encounter"],
};

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
    return sessionHiTypes.length === 8;
  }
  const allowed = mapHiTypesToBundleTypes(sessionHiTypes);
  if (!allowed.length) return true;
  return allowed.includes(bundleType);
}
