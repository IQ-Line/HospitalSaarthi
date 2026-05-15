export function maskAadhaar(digits: string): string {
  if (digits.length < 4) return "****";
  return `********${digits.slice(-4)}`;
}

/** `aadhaarMasked` from session context must match the resend plain Aadhaar (last 4). Fail closed. */
export function aadhaarMatchesSessionMask(
  aadhaarDigits: string,
  aadhaarMasked: unknown,
): boolean {
  if (typeof aadhaarMasked !== "string" || aadhaarMasked.trim() === "") {
    return false;
  }
  const digitsFromMask = aadhaarMasked.replace(/\D/g, "");
  if (digitsFromMask.length < 4) {
    return false;
  }
  return aadhaarDigits.endsWith(digitsFromMask.slice(-4));
}
