export function maskAadhaar(digits: string): string {
  if (digits.length < 4) return "****";
  return `********${digits.slice(-4)}`;
}

/** `aadhaarMasked` from session context must match the resend plain Aadhaar (last 4). */
export function aadhaarMatchesSessionMask(
  aadhaarDigits: string,
  aadhaarMasked: unknown,
): boolean {
  if (typeof aadhaarMasked !== "string") return true;
  const digitsFromMask = aadhaarMasked.replace(/\D/g, "");
  if (digitsFromMask.length < 4) return true;
  const suffix = digitsFromMask.slice(-4);
  return aadhaarDigits.endsWith(suffix);
}
