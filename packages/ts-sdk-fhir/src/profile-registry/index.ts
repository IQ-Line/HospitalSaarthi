/**
 * NRCeS profile registry.
 *
 * Single source of truth for which NRCeS R4 ImplementationGuide profiles the
 * platform produces, and which version of each is pinned. Upgrading a profile
 * is one PR here plus regenerated test fixtures.
 *
 * Canonical URLs follow the NRCeS pattern:
 *   `https://nrces.in/ndhm/fhir/r4/StructureDefinition/<ProfileName>`
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://nrces.in/ndhm/fhir/r4/index.html
 */

export interface NrcesProfile {
  readonly canonicalUrl: string;
  readonly version: string;
}

export const NRCeS_PROFILES = {
  OpConsultRecord: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord',
    version: '2.0.0',
  },
  Prescription: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord',
    version: '2.0.0',
  },
  DischargeSummary: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord',
    version: '2.0.0',
  },
  DiagnosticReport: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord',
    version: '2.0.0',
  },
  HealthDocumentRecord: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord',
    version: '2.0.0',
  },
  ImmunizationRecord: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/ImmunizationRecord',
    version: '2.0.0',
  },
  WellnessRecord: {
    canonicalUrl: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/WellnessRecord',
    version: '2.0.0',
  },
} as const satisfies Record<string, NrcesProfile>;

export type NrcesProfileName = keyof typeof NRCeS_PROFILES;
