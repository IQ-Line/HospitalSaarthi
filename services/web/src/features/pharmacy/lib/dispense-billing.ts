import type { DispenseLineDraft, OpdPrescriptionMedicineLine } from '../types';

export function multiplyDecimal(quantity: string, unitAmount: string): number {
  const qty = Number(quantity);
  const unit = Number(unitAmount);
  if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty < 0 || unit < 0) {
    return 0;
  }
  return qty * unit;
}

/** Parses a non-negative numeric string; empty/invalid/negative all coerce to 0. */
function normalizeNonNegativeNumber(raw: string | null | undefined): number {
  if (raw == null || raw === '') return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function computeLineBilling(line: {
  quantity_dispensed: string;
  unit_amount: string;
  line_discount?: string;
  tax_percent?: string;
}): { line_total: string; tax_amount: string } {
  const gross = multiplyDecimal(line.quantity_dispensed, line.unit_amount);
  const lineDiscount = normalizeNonNegativeNumber(line.line_discount);
  const taxPercent = normalizeNonNegativeNumber(line.tax_percent);
  const taxable = Math.max(0, gross - lineDiscount);
  const taxAmount = taxable * (taxPercent / 100);
  const lineTotal = taxable + taxAmount;
  return {
    tax_amount: taxAmount.toFixed(4),
    line_total: lineTotal.toFixed(4),
  };
}

export function lineTotal(
  quantity: string,
  unitAmount: string,
  lineDiscount = '0',
  taxPercent = '0',
): string {
  return computeLineBilling({
    quantity_dispensed: quantity,
    unit_amount: unitAmount,
    line_discount: lineDiscount,
    tax_percent: taxPercent,
  }).line_total;
}

export function sumDraftLineTotals(lines: readonly DispenseLineDraft[]): string {
  let sum = 0;
  for (const line of lines) {
    sum += Number(computeLineBilling(line).line_total);
  }
  return sum.toFixed(4);
}

export function computeDispenseTotals(
  lines: readonly DispenseLineDraft[],
  discountRaw: string,
): { subtotal: string; discount: string; total_amount: string } {
  const subtotal = sumDraftLineTotals(lines);
  const discountValue = Number(discountRaw);
  const discount = Number.isFinite(discountValue) && discountValue >= 0 ? discountValue : 0;
  const sub = Number(subtotal);
  const total = Math.max(0, sub - discount);
  return {
    subtotal,
    discount: discount.toFixed(4),
    total_amount: total.toFixed(4),
  };
}

export function formatInrAmount(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Human-friendly form value from persisted numeric(12,4) strings (e.g. `1.0000` → `1`). */
export function formatDispenseDecimalInput(value: string | null | undefined): string {
  if (value == null) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return trimmed;
  return String(Number(num.toFixed(4)));
}

export function medicineDisplayLabel(medicine: OpdPrescriptionMedicineLine): string {
  return medicine.name.trim();
}

const emptyLineDraftFields = {
  line_discount: '0',
  tax_percent: '0',
} as const;

export function draftLinesFromPrescription(
  medicines: OpdPrescriptionMedicineLine[],
): DispenseLineDraft[] {
  return medicines.map((medicine, index) => ({
    key: `rx-${medicine.line_no}-${index}`,
    medicine_id: medicine.medicine_id,
    medicine_display_name: medicineDisplayLabel(medicine),
    prescribed_quantity: medicine.quantity ?? '',
    quantity_dispensed: medicine.quantity ?? '1',
    unit_amount: formatDispenseDecimalInput(medicine.catalog_unit_price) || '0',
    ...emptyLineDraftFields,
  }));
}

export function draftLinesFromSaved(
  lines: Array<{
    medicine_id?: string | null;
    medicine_display_name: string;
    prescribed_quantity: string | null;
    quantity_dispensed: string;
    unit_amount: string;
    line_discount?: string;
    tax_percent?: string;
  }>,
): DispenseLineDraft[] {
  return lines.map((line, index) => ({
    key: `saved-${index}`,
    medicine_id: line.medicine_id ?? null,
    medicine_display_name: line.medicine_display_name,
    prescribed_quantity: formatDispenseDecimalInput(line.prescribed_quantity),
    quantity_dispensed: formatDispenseDecimalInput(line.quantity_dispensed),
    unit_amount: formatDispenseDecimalInput(line.unit_amount),
    line_discount: formatDispenseDecimalInput(line.line_discount) || '0',
    tax_percent: formatDispenseDecimalInput(line.tax_percent) || '0',
  }));
}
