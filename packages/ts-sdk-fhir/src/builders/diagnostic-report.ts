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
  FhirReference,
} from '../types/index.js';

export interface BuildDiagnosticReportInput {
  identifier?: FhirIdentifier[];
  status: DiagnosticReport['status'];
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: FhirDateTime;
  issued?: FhirInstant;
  performer?: FhirReference[];
  /** References to `Observation` resources for individual results. */
  result?: FhirReference[];
}

/**
 * Build a `DiagnosticReport` resource.
 *
 * TODO: implement. The body must:
 *   1. Stamp `meta.profile` with the DiagnosticReport profile when
 *      callers indicate NRCeS DiagnosticReportRecord production.
 *   2. Validate `code` system is LOINC for lab reports.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildDiagnosticReport(_input: BuildDiagnosticReportInput): DiagnosticReport {
  // TODO: implement per ADR-0023.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
  throw new Error('buildDiagnosticReport: not implemented');
}
