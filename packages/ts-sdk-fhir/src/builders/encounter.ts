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
  FhirPeriod,
  FhirReference,
} from '../types/index.js';

export interface BuildEncounterInput {
  identifier?: FhirIdentifier[];
  status: Encounter['status'];
  /** ActEncounterCode (`AMB`, `IMP`, `EMER`, ...). */
  class: FhirCoding;
  type?: FhirCodeableConcept[];
  subject: FhirReference;
  period?: FhirPeriod;
}

/**
 * Build an `Encounter` resource.
 *
 * TODO: implement. The body must:
 *   1. Construct a `meta.profile` array if the caller specifies a NRCeS
 *      profile; otherwise leave `meta` undefined.
 *   2. Validate `class` is from the v3 ActEncounterCode value set
 *      (`http://terminology.hl7.org/CodeSystem/v3-ActCode`).
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildEncounter(_input: BuildEncounterInput): Encounter {
  // TODO: implement per ADR-0023.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
  throw new Error('buildEncounter: not implemented');
}
