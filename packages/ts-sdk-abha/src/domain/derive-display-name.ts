/**
 * Pure rule for choosing which name field to render to the user.
 *
 * Order of preference (matches what ABDM displays in the PHR app):
 *   1. `fullName`          — gateway-supplied composite, when present
 *   2. assembled `firstName + middleName? + lastName`
 *   3. `abhaAddress` (alias before `@`)
 *   4. `abhaNumber` (last 4 digits, masked)
 *   5. literal `'Unknown'`
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */

import type { AbhaProfile } from '../types/abha-profile.js';

export function deriveDisplayName(_profile: AbhaProfile): string {
  // TODO: implement the preference order above.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
  throw new Error('deriveDisplayName: not implemented');
}
