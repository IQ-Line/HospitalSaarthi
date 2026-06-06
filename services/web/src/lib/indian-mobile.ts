import { z } from 'zod';

/** 10-digit Indian mobile: digits only, must start with 6, 7, 8, or 9. */
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export const INDIAN_MOBILE_VALIDATION_MESSAGE =
  'Enter a valid 10-digit mobile number (must start with 6, 7, 8, or 9)';

export function sanitizeIndianMobileInput(value: string, maxLength = 10): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function isValidIndianMobile(value: string | undefined | null): boolean {
  return INDIAN_MOBILE_RE.test((value ?? '').trim());
}

/** React Hook Form `register()` rules — same rules as visit registration phone field. */
export function indianMobileRegisterOptions(options?: { required?: boolean }) {
  const required = options?.required ?? true;
  return {
    required: required ? 'Phone number is required' : false,
    pattern: {
      value: INDIAN_MOBILE_RE,
      message: INDIAN_MOBILE_VALIDATION_MESSAGE,
    },
  } as const;
}

export function indianMobileZodField(requiredMessage = 'Required') {
  return z
    .string()
    .min(1, requiredMessage)
    .regex(INDIAN_MOBILE_RE, INDIAN_MOBILE_VALIDATION_MESSAGE);
}

export function indianMobileZodFieldOptional() {
  return z.union([
    z.literal(''),
    z.string().regex(INDIAN_MOBILE_RE, INDIAN_MOBILE_VALIDATION_MESSAGE),
  ]);
}
