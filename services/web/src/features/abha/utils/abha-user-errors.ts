import { ApiError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';

export const MSG_VALID_AADHAAR = 'Please enter valid Aadhaar Number';
export const MSG_VALID_ABHA_NUMBER = 'Please enter valid ABHA Number';

type ParsedApiBody = {
  code?: unknown;
  message?: unknown;
  error?: unknown;
  status?: unknown;
  data?: unknown;
  details?: unknown;
};

function parseApiBody(body: string): ParsedApiBody | null {
  try {
    return JSON.parse(body) as ParsedApiBody;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function nestedPayload(parsed: ParsedApiBody): Record<string, unknown> | null {
  return asRecord(parsed.data) ?? asRecord(parsed.details);
}

function messageText(parsed: ParsedApiBody | null): string {
  if (!parsed) return '';
  return typeof parsed.message === 'string' ? parsed.message : '';
}

function errorCodeFrom(parsed: ParsedApiBody | null): string | undefined {
  if (!parsed) return undefined;
  if (typeof parsed.code === 'string' && parsed.code.length > 0) return parsed.code;
  const nested = nestedPayload(parsed);
  const err = asRecord(nested?.error);
  return typeof err?.code === 'string' ? err.code : undefined;
}

function hasInvalidLoginId(parsed: ParsedApiBody | null): boolean {
  if (!parsed) return false;
  const nested = nestedPayload(parsed);
  if (nested?.loginId === 'Invalid LoginId') return true;
  const msg = messageText(parsed);
  return /invalid loginid/i.test(msg) || /loginid:\s*invalid loginid/i.test(msg);
}

/** Client-side Aadhaar checks before calling NHA (matches legacy HIMS behaviour). */
export function isClientInvalidAadhaar(fullAadhaar: string): boolean {
  if (!/^\d{12}$/.test(fullAadhaar)) return false;
  const first = fullAadhaar[0];
  return fullAadhaar.split('').every((digit) => digit === first);
}

export function isInvalidAadhaarApiError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const parsed = parseApiBody(err.body);
  if (errorCodeFrom(parsed) === 'ABDM-1204') return true;
  if (hasInvalidLoginId(parsed)) return true;
  const msg = messageText(parsed).toLowerCase();
  return msg.includes('invalid aadhaar') || msg.includes('invalid loginid');
}

export function isInvalidAbhaNumberApiError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const parsed = parseApiBody(err.body);
  if (errorCodeFrom(parsed) === 'ABDM-1114') return true;
  if (hasInvalidLoginId(parsed)) return true;
  const msg = messageText(parsed).toLowerCase();
  return (
    msg.includes('invalid abha') ||
    msg.includes('invalid login hint') ||
    msg.includes('user not found')
  );
}

export function resolveAadhaarWizardError(err: unknown): string {
  if (isInvalidAadhaarApiError(err)) return MSG_VALID_AADHAAR;
  return mutationErrorMessage(err);
}

export function resolveAbhaNumberWizardError(err: unknown): string {
  if (isInvalidAbhaNumberApiError(err)) return MSG_VALID_ABHA_NUMBER;
  return mutationErrorMessage(err);
}
