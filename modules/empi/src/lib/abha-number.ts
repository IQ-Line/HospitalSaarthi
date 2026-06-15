/** Canonical dashed ABHA for EMPI exact-match search (14 digits). */
export function normalizeAbhaNumberForEmpi(raw: string | undefined | null): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 14)}`;
  }
  return trimmed;
}
