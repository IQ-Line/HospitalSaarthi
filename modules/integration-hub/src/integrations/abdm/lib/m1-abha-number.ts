import { AbdmUseCaseError } from "./m1-errors.js";

/** Normalize to `91-1234-5678-9012` (14 digits). */
export function normalizeAbhaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) {
    throw new AbdmUseCaseError("abhaNumber must be 14 digits", 400);
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 14)}`;
}

export function maskAbhaNumber(formatted: string): string {
  return `**-****-****-${formatted.slice(-4)}`;
}
