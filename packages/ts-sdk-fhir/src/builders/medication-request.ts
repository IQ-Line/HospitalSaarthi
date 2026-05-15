/**
 * `MedicationRequest` builder.
 *
 * Used by OPD and Pharmacy modules when serialising prescription rows.
 * Attached to `consultation.finalized` / `prescription.issued` events
 * per ADR-0023.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/medicationrequest.html
 */

import type {
  MedicationRequest,
  FhirCodeableConcept,
  FhirDateTime,
  FhirIdentifier,
  FhirMeta,
  FhirReference,
} from "../types/index.js";

export interface BuildMedicationRequestInput {
  identifier?: FhirIdentifier[];
  status: MedicationRequest["status"];
  intent: MedicationRequest["intent"];
  /** Either `medicationCodeableConcept` or `medicationReference` — exactly one required. */
  medicationCodeableConcept?: FhirCodeableConcept;
  medicationReference?: FhirReference;
  subject: FhirReference;
  encounter?: FhirReference;
  authoredOn?: FhirDateTime;
  requester?: FhirReference;
  meta?: FhirMeta;
}

/**
 * Build a `MedicationRequest` resource.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildMedicationRequest(input: BuildMedicationRequestInput): MedicationRequest {
  const hasC = input.medicationCodeableConcept !== undefined;
  const hasR = input.medicationReference !== undefined;
  if (hasC === hasR) {
    throw new Error(
      "MedicationRequest: exactly one of medicationCodeableConcept or medicationReference must be set",
    );
  }
  const authoredOn = input.authoredOn ?? new Date().toISOString();
  return {
    resourceType: "MedicationRequest",
    ...(input.identifier ? { identifier: input.identifier } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
    status: input.status,
    intent: input.intent,
    ...(input.medicationCodeableConcept
      ? { medicationCodeableConcept: input.medicationCodeableConcept }
      : { medicationReference: input.medicationReference }),
    subject: input.subject,
    ...(input.encounter ? { encounter: input.encounter } : {}),
    authoredOn,
    ...(input.requester ? { requester: input.requester } : {}),
  };
}
