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
export declare const NRCeS_PROFILES: {
    readonly OpConsultRecord: {
        readonly canonicalUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord";
        readonly version: "2.0.0";
    };
    readonly Prescription: {
        readonly canonicalUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord";
        readonly version: "2.0.0";
    };
    readonly DischargeSummary: {
        readonly canonicalUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord";
        readonly version: "2.0.0";
    };
    readonly DiagnosticReport: {
        readonly canonicalUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord";
        readonly version: "2.0.0";
    };
    readonly HealthDocumentRecord: {
        readonly canonicalUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord";
        readonly version: "2.0.0";
    };
    readonly ImmunizationRecord: {
        readonly canonicalUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/ImmunizationRecord";
        readonly version: "2.0.0";
    };
    readonly WellnessRecord: {
        readonly canonicalUrl: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/WellnessRecord";
        readonly version: "2.0.0";
    };
};
export type NrcesProfileName = keyof typeof NRCeS_PROFILES;
//# sourceMappingURL=index.d.ts.map