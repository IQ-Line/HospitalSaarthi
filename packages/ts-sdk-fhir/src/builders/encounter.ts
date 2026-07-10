/**
 * `Encounter` builder.
 *
 * Used by clinical modules (OPD, IPD, ER) to serialise visit/admission rows
 * into FHIR `Encounter` resources, attached to `*.finalized` event payloads
 * per ADR-0023.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/encounter.html
 */

import type {
  Encounter,
  FhirCodeableConcept,
  FhirCoding,
  FhirIdentifier,
  FhirMeta,
  FhirPeriod,
  FhirReference,
} from "../types/index.js";

// eslint-disable-next-line sonarjs/no-clear-text-protocols -- canonical FHIR system URI (identifier, not a network call)
const V3_ACT_ENCOUNTER = "http://terminology.hl7.org/CodeSystem/v3-ActCode";

export interface BuildEncounterInput {
  identifier?: FhirIdentifier[];
  status: Encounter["status"];
  /** ActEncounterCode (`AMB`, `IMP`, `EMER`, …). `system` should be v3-ActCode when set. */
  class: FhirCoding;
  type?: FhirCodeableConcept[];
  subject: FhirReference;
  period?: FhirPeriod;
  /** Optional `meta.profile` URLs (NRCeS or core StructureDefinitions). */
  meta?: FhirMeta;
}

/**
 * Build an `Encounter` resource.
 *
 * When `class.system` is set, it must be the v3 ActEncounterCode code system.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildEncounter(input: BuildEncounterInput): Encounter {
  if (input.class.system && input.class.system !== V3_ACT_ENCOUNTER) {
    throw new TypeError(
      `Encounter.class.system must be "${V3_ACT_ENCOUNTER}" when provided (got ${input.class.system})`,
    );
  }
  return {
    resourceType: "Encounter",
    ...(input.identifier ? { identifier: input.identifier } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
    status: input.status,
    class: input.class,
    ...(input.type ? { type: input.type } : {}),
    subject: input.subject,
    ...(input.period ? { period: input.period } : {}),
  };
}
