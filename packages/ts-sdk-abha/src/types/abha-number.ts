/**
 * ABHA Number — the 14-digit Ayushman Bharat Health Account identifier.
 *
 * Format: `XX-XXXX-XXXX-XXXX` (14 digits, optionally hyphenated).
 * The last digit is a Verhoeff-algorithm checksum.
 *
 * @see https://abdm.gov.in/abha-number
 */

/** Branded type — only constructable through the validator. */
export type AbhaNumber = string & { readonly __brand: 'AbhaNumber' };

/** Hyphen-stripped form: 14 consecutive digits. */
const ABHA_NUMBER_REGEX = /^\d{14}$/;

/** Strip hyphens and whitespace. */
export function normalizeAbhaNumber(input: string): string {
  return input.replace(/[\s-]/g, '');
}

/**
 * Validate an ABHA Number.
 *
 * Performs:
 *   1. Format check (14 digits after normalisation).
 *   2. Verhoeff checksum verification.
 *
 * TODO: implement Verhoeff. The format check below is in place; the checksum
 * step is the missing piece. Reference algorithm:
 *   - Verhoeff, J. (1969). *Error Detecting Decimal Codes*. Mathematisch Centrum.
 *   - https://en.wikipedia.org/wiki/Verhoeff_algorithm
 */
export function isValidAbhaNumber(input: string): input is AbhaNumber {
  const normalized = normalizeAbhaNumber(input);
  if (!ABHA_NUMBER_REGEX.test(normalized)) return false;
  // TODO: Verhoeff checksum.
  return true;
}
