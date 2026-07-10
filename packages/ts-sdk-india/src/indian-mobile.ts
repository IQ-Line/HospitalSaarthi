/**
 * Language-neutral Indian-mobile-number rules, shared across the module/service
 * boundary (backend modules + web) so the "10-digit, starts 6-9" contract lives
 * in exactly one place. NO framework deps (no zod / react-hook-form) — FE adapters
 * are built on top of these in `services/web/src/lib/indian-mobile.ts`.
 */

/** 10-digit Indian mobile: digits only, must start with 6, 7, 8, or 9. */
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export const INDIAN_MOBILE_VALIDATION_MESSAGE =
  'Enter a valid 10-digit mobile number (must start with 6, 7, 8, or 9)';

/** Strip non-digits and cap to `maxLength` (default 10) — for input masking. */
export function sanitizeIndianMobileInput(value: string, maxLength = 10): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

/** True when `value` (trimmed) is a valid 10-digit Indian mobile number. */
export function isValidIndianMobile(value: string | undefined | null): boolean {
  return INDIAN_MOBILE_RE.test((value ?? '').trim());
}

/**
 * Canonical storage/query format: strip non-digits, take the last 10 and prefix
 * `+91`. Returns `null` when fewer than 10 digits are present. This is the single
 * source of truth for what EMPI/registration desk registration store as the phone.
 */
export function normalizeIndianMobile(raw: string | undefined | null): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `+91${digits.slice(-10)}`;
}
