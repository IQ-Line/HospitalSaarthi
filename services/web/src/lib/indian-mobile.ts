import { z } from 'zod';
import {
  INDIAN_MOBILE_RE,
  INDIAN_MOBILE_VALIDATION_MESSAGE,
  isValidIndianMobile,
  normalizeIndianMobile,
  sanitizeIndianMobileInput,
} from '@hims/ts-sdk-india';

// Re-export the language-neutral core so existing `@/lib/indian-mobile` imports
// keep working unchanged. The rules themselves live once in `@hims/ts-sdk-india`.
export {
  INDIAN_MOBILE_RE,
  INDIAN_MOBILE_VALIDATION_MESSAGE,
  isValidIndianMobile,
  normalizeIndianMobile,
  sanitizeIndianMobileInput,
};

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
