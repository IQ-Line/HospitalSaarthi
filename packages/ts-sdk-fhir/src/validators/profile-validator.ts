/**
 * NRCeS profile validator.
 *
 * Validates an assembled FHIR `Bundle` (typically of `type: 'document'`)
 * against a NRCeS R4 ImplementationGuide profile. Used by Record Foundation
 * before persisting to immutable bundle storage (ADR-0022).
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see docs/architecture/adr/0022-immutable-fhir-document-storage.md
 * @see https://hl7.org/fhir/R4/profiling.html
 */

import type { Bundle } from '../types/index.js';

export interface ValidationIssue {
  /** JSONPath into the resource where the issue was found, e.g. `Bundle.entry[0].resource.subject`. */
  location: string;
  /** Issue severity. `error` blocks acceptance; `warning` does not. */
  severity: 'error' | 'warning' | 'information';
  /** Stable code; suitable for telemetry counters. */
  code: string;
  /** Human-readable message. */
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Validate `bundle` against the NRCeS profile identified by `profileUrl` at
 * the given `version`.
 *
 * TODO: implement. The body must:
 *   1. Resolve the profile's StructureDefinition + dependent ValueSets from
 *      a bundled NRCeS package (loaded from `assets/nrces/<version>/`).
 *   2. Run cardinality, fixed-value, slicing, and binding checks.
 *   3. Emit ValidationIssues with stable `code`s for telemetry.
 *
 * Implementation note: prefer wrapping the HL7 official validator
 * (`fhir-validator` jar) in CI rather than reimplementing it here. The
 * runtime path can use a TS-native subset for fast pre-checks.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function validateAgainstProfile(
  _bundle: Bundle,
  _profileUrl: string,
  _version: string,
): ValidationResult {
  // TODO: implement per ADR-0023.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
  throw new Error('validateAgainstProfile: not implemented');
}
