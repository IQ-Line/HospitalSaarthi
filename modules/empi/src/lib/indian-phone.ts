/** Canonical EMPI storage/query format — matches desk registration `+91${tenDigit}`. */
export function normalizeIndianPhoneForEmpi(raw: string | undefined | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `+91${digits.slice(-10)}`;
}
