/**
 * NRCeS profile validator.
 *
 * Validates an assembled FHIR `Bundle` (typically of `type: 'document'`)
 * against a NRCeS R4 ImplementationGuide profile. Used by Record Foundation
 * before persisting to immutable bundle storage (ADR-0022).
 *
 * Runtime implementation: **structural pre-checks** only (fast, no IG assets).
 * Full cardinality, slicing, and terminology validation should run in CI
 * using the HL7 FHIR Validator JAR against pinned NRCeS packages.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see docs/architecture/adr/0022-immutable-fhir-document-storage.md
 * @see https://hl7.org/fhir/R4/profiling.html
 */

import type { Bundle, Composition, FhirResourceBase } from "../types/index.js";

function isComposition(r: FhirResourceBase | undefined): r is Composition {
  return r?.resourceType === "Composition";
}

export interface ValidationIssue {
  /** JSONPath into the resource where the issue was found, e.g. `Bundle.entry[0].resource.subject`. */
  location: string;
  /** Issue severity. `error` blocks acceptance; `warning` does not. */
  severity: "error" | "warning" | "information";
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
 * Performs structural checks only. When `profileUrl` / `version` do not
 * match the bundle `Composition.meta.profile`, an error is recorded.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function validateAgainstProfile(
  bundle: Bundle,
  profileUrl: string,
  version: string,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const expected = `${profileUrl}|${version}`;

  if (bundle.resourceType !== "Bundle") {
    errors.push({
      location: "Bundle",
      severity: "error",
      code: "not-bundle",
      message: "Root resource must be Bundle",
    });
  }
  if (bundle.type !== "document") {
    errors.push({
      location: "Bundle.type",
      severity: "error",
      code: "not-document-bundle",
      message: "Bundle.type must be 'document' for NRCeS document profiles",
    });
  }

  const first = bundle.entry?.[0]?.resource;
  if (!isComposition(first)) {
    errors.push({
      location: "Bundle.entry[0].resource",
      severity: "error",
      code: "missing-composition-head",
      message: "First bundle entry must be a Composition resource",
    });
  } else {
    const profiles = first.meta?.profile ?? [];
    if (!profiles.includes(expected)) {
      errors.push({
        location: "Bundle.entry[0].resource.meta.profile",
        severity: "error",
        code: "profile-mismatch",
        message: `Composition.meta.profile must include ${expected} (got ${JSON.stringify(profiles)})`,
      });
    }
    if (!first.text?.div) {
      errors.push({
        location: "Bundle.entry[0].resource.text",
        severity: "error",
        code: "composition-narrative-missing",
        message: "Composition.text.div is required for document bundles",
      });
    }
  }

  warnings.push({
    location: "Bundle",
    severity: "information",
    code: "ig-validation-deferred",
    message:
      "Full NRCeS IG validation (terminology, slicing, cardinality) is deferred to CI using the HL7 FHIR Validator.",
  });

  return { valid: errors.length === 0, errors, warnings };
}
