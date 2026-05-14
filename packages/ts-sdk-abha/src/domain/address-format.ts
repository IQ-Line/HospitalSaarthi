/**
 * Env-aware ABHA Address suffix selection and formatting.
 *
 * The platform talks to two ABDM environments:
 *   - sandbox  → `@sbx`
 *   - production → `@abdm`
 *
 * This module is the single decision point for which suffix to use given a
 * runtime gateway environment, and for re-formatting an address that was
 * produced in one env for display in another.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */

import { ABDM_SUFFIX, SBX_SUFFIX } from '../constants/gateway-suffixes.js';
import type { GatewayEnv } from '../types/abha-address.js';

export function suffixFor(env: GatewayEnv): typeof ABDM_SUFFIX | typeof SBX_SUFFIX {
  return env === 'production' ? ABDM_SUFFIX : SBX_SUFFIX;
}

/**
 * Format an alias + env into a full ABHA Address.
 *
 * TODO: implement. Body must:
 *   1. Validate the alias against the local-part rules (delegate to
 *      `parseAbhaAddress` after concatenation).
 *   2. Throw on invalid alias.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function formatAbhaAddress(_alias: string, _env: GatewayEnv): string {
  // TODO: implement.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
  throw new Error('formatAbhaAddress: not implemented');
}
