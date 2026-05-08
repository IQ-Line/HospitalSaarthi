/**
 * Helpers to attach ABHA identifiers to a FHIR `Patient`.
 *
 * Uses system URI constants from `@hims/ts-sdk-fhir/identifiers`.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */

import type { FhirIdentifier, Patient } from '@hims/ts-sdk-fhir';
import { ABHA_ADDRESS_SYSTEM_URI, ABHA_NUMBER_SYSTEM_URI } from '@hims/ts-sdk-fhir';
import type { AbhaAddress } from '../types/abha-address.js';
import type { AbhaNumber } from '../types/abha-number.js';

export interface AttachAbhaIdentifiersInput {
  abhaNumber?: AbhaNumber;
  abhaAddresses?: AbhaAddress[];
}

/**
 * Return a *new* Patient with ABHA identifiers appended to `identifier[]`.
 * Does not mutate `patient`.
 *
 * TODO: implement. Body must:
 *   1. Build `FhirIdentifier` entries for the ABHA Number and each ABHA
 *      Address using the imported system URI constants.
 *   2. Set `use: 'official'` on the ABHA Number.
 *   3. Preserve any existing `identifier[]` entries.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function attachAbhaIdentifiers(_patient: Patient, _input: AttachAbhaIdentifiersInput): Patient {
  // TODO: implement.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
  // Reference imports until implementation lands (avoids unused-import warnings).
  void ABHA_NUMBER_SYSTEM_URI;
  void ABHA_ADDRESS_SYSTEM_URI;
  const _placeholder: FhirIdentifier[] = [];
  void _placeholder;
  throw new Error('attachAbhaIdentifiers: not implemented');
}
