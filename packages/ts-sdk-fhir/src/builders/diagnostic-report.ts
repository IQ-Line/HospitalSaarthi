/**
 * `DiagnosticReport` builder.
 *
 * Used by Lab/Radiology modules when serialising finalised report rows
 * per ADR-0023.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/diagnosticreport.html
 */

import type {
  DiagnosticReport,
  FhirCodeableConcept,
  FhirDateTime,
  FhirIdentifier,
  FhirInstant,
  FhirMeta,
  FhirReference,
} from "../types/index.js";

// eslint-disable-next-line sonarjs/no-clear-text-protocols -- canonical FHIR system URI (identifier, not a network call)
const LOINC_SYSTEM = "http://loinc.org";

export interface BuildDiagnosticReportInput {
  identifier?: FhirIdentifier[];
  status: DiagnosticReport["status"];
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: FhirDateTime;
  issued?: FhirInstant;
  performer?: FhirReference[];
  /** References to `Observation` resources for individual results. */
  result?: FhirReference[];
  meta?: FhirMeta;
  /**
   * When true, require `code.coding` to include a LOINC (`http://loinc.org`) entry.
   * Recommended for lab reports bound to NRCeS DiagnosticReportRecord.
   */
  requireLoinc?: boolean;
}

function hasLoinc(code: FhirCodeableConcept): boolean {
  return Boolean(
    code.coding?.some((c) => c.system === LOINC_SYSTEM && Boolean(c.code?.length)),
  );
}

/**
 * Build a `DiagnosticReport` resource.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildDiagnosticReport(input: BuildDiagnosticReportInput): DiagnosticReport {
  if (input.requireLoinc && !hasLoinc(input.code)) {
    throw new TypeError(
      `DiagnosticReport.code must include a LOINC coding (${LOINC_SYSTEM}) when requireLoinc is true`,
    );
  }
  return {
    resourceType: "DiagnosticReport",
    ...(input.identifier ? { identifier: input.identifier } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
    status: input.status,
    ...(input.category ? { category: input.category } : {}),
    code: input.code,
    ...(input.subject ? { subject: input.subject } : {}),
    ...(input.encounter ? { encounter: input.encounter } : {}),
    ...(input.effectiveDateTime ? { effectiveDateTime: input.effectiveDateTime } : {}),
    ...(input.issued ? { issued: input.issued } : {}),
    ...(input.performer ? { performer: input.performer } : {}),
    ...(input.result ? { result: input.result } : {}),
  };
}
