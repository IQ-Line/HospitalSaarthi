/**
 * Zod schema for ABHA Address.
 *
 * `zod` is a peer dependency; consumers must install it. This file declares
 * the schema with the runtime checks ABDM/NRCeS document.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */

import { z } from 'zod';

/**
 * Permissive baseline schema. Suffix-vs-env enforcement is delegated to
 * `isValidAbhaAddress(input, env)` in `../types/abha-address`, since env is
 * runtime-supplied and not part of the schema's static knowledge.
 *
 * TODO: extend with `.refine()` once the alias rules from NRCeS are
 * incorporated (currently the regex matches the documented baseline).
 */
export const abhaAddressSchema = z
  .string()
  .regex(/^[a-zA-Z0-9._]{4,}(@abdm|@sbx)$/, 'Invalid ABHA Address format');

export type AbhaAddressInput = z.infer<typeof abhaAddressSchema>;
