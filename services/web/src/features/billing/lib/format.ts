export function formatMoneyDisplay(value: string | number): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
}

/** API / tariff_master storage (4 decimal places). */
export function formatMoneyApi(value: string | number): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(4) : String(value);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
