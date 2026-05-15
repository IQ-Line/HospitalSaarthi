/**
 * Map an ABHA profile to FHIR Patient demographics.
 *
 * Pure function: takes the gateway-shaped `AbhaProfile`, returns a partial
 * `Patient` shaped to NRCeS Patient profile expectations. EMPI calls this
 * when promoting/linking an ABHA profile to a tenant golden record.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */

import type { Patient } from '@hims/ts-sdk-fhir';
import type { AbhaProfile } from '../types/abha-profile.js';

/**
 * Convert an `AbhaProfile` into a FHIR `Patient` (demographics-only, no
 * identifiers — call `attachAbhaIdentifiers` from `../fhir/patient-identifier`
 * to add ABHA Number / Address identifiers afterwards).
 *
 * TODO: implement. The body must:
 *   1. Map gateway gender codes (`M`/`F`/`O`/`U`) → FHIR gender values.
 *   2. Build a `birthDate` string from the partial DOB; if only `year` is
 *      present, return year-only ISO date (`YYYY`) which FHIR accepts.
 *   3. Construct `name` arrays preferring `fullName` as `text` plus
 *      structured `given`/`family` when individual fields are populated.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function mapProfileToPatient(_profile: AbhaProfile): Patient {
  // TODO: implement.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
  throw new Error('mapProfileToPatient: not implemented');
}
