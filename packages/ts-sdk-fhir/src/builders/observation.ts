/**
 * `Observation` builder.
 *
 * Used by Lab, Vitals, and other modules that emit individual measurement
 * resources, typically referenced from a `DiagnosticReport.result[]`.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/observation.html
 */

import type {
  Observation,
  FhirCodeableConcept,
  FhirDateTime,
  FhirIdentifier,
  FhirMeta,
  FhirReference,
} from "../types/index.js";

const LAB_CATEGORY: FhirCodeableConcept = {
  coding: [
    {
      // eslint-disable-next-line sonarjs/no-clear-text-protocols -- canonical FHIR system URI (identifier, not a network call)
      system: "http://terminology.hl7.org/CodeSystem/observation-category",
      code: "laboratory",
      display: "Laboratory",
    },
  ],
};

export interface BuildObservationInput {
  identifier?: FhirIdentifier[];
  status: Observation["status"];
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: FhirDateTime;
  valueQuantity?: { value: number; unit?: string; system?: string; code?: string };
  valueString?: string;
  valueCodeableConcept?: FhirCodeableConcept;
  meta?: FhirMeta;
  /** When `"lab"`, default `category` to laboratory if omitted. */
  domainHint?: "lab" | "vitals" | "other";
}

/**
 * Build an `Observation` resource.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildObservation(input: BuildObservationInput): Observation {
  const valueCount = [
    input.valueQuantity,
    input.valueString,
    input.valueCodeableConcept,
  ].filter(Boolean).length;
  if (valueCount > 1) {
    throw new TypeError("Observation: at most one of valueQuantity, valueString, valueCodeableConcept may be set");
  }

  const category =
    input.category ??
    (input.domainHint === "lab" ? [LAB_CATEGORY] : undefined);

  return {
    resourceType: "Observation",
    ...(input.identifier ? { identifier: input.identifier } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
    status: input.status,
    ...(category ? { category } : {}),
    code: input.code,
    ...(input.subject ? { subject: input.subject } : {}),
    ...(input.effectiveDateTime ? { effectiveDateTime: input.effectiveDateTime } : {}),
    ...(input.valueQuantity ? { valueQuantity: input.valueQuantity } : {}),
    ...(input.valueString ? { valueString: input.valueString } : {}),
    ...(input.valueCodeableConcept ? { valueCodeableConcept: input.valueCodeableConcept } : {}),
  };
}
