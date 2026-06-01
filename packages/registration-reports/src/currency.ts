export function formatReceiptRs(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Rs 0.00";
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return `Rs ${formatted}`;
}
