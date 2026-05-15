/**
 * Zod schema for ABHA Number.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */

import { z } from 'zod';
import { isValidAbhaNumber, normalizeAbhaNumber } from '../types/abha-number.js';

/**
 * Validates and normalises an ABHA Number. Output is the hyphen-stripped
 * 14-digit string. Verhoeff checksum is delegated to `isValidAbhaNumber`
 * once that is implemented (see TODO in `../types/abha-number`).
 */
export const abhaNumberSchema = z
  .string()
  .transform(normalizeAbhaNumber)
  .refine(isValidAbhaNumber, 'Invalid ABHA Number');

export type AbhaNumberInput = z.infer<typeof abhaNumberSchema>;
