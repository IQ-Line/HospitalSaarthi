import type { DispenseLineDraft, OpdPrescriptionMedicineLine } from '../types';

export function multiplyDecimal(quantity: string, unitAmount: string): number {
  const qty = Number(quantity);
  const unit = Number(unitAmount);
  if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty < 0 || unit < 0) {
    return 0;
  }
  return qty * unit;
}

function normalizeDiscount(raw: string | null | undefined): number {
  if (raw == null || raw === '') return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function normalizeTaxPercent(raw: string | null | undefined): number {
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
  const lineDiscount = normalizeDiscount(line.line_discount);
  const taxPercent = normalizeTaxPercent(line.tax_percent);
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

/** Prescription column label — includes strength when present. */
export function prescribedItemLabel(medicine: OpdPrescriptionMedicineLine): string {
  const name = medicine.name.trim();
  if (!name) return '';
  const strength = medicine.strength?.trim();
  return strength ? `${name} ${strength}` : name;
}

export function computePendingPrescribedQty(
  prescribedQuantity: string,
  issuedQuantity: string,
): number | null {
  const prescribedTrimmed = prescribedQuantity.trim();
  if (!prescribedTrimmed) return null;
  const prescribed = Number(prescribedTrimmed);
  const issued = Number(issuedQuantity.trim());
  if (!Number.isFinite(prescribed) || prescribed < 0) return null;
  if (!Number.isFinite(issued) || issued < 0) return prescribed;
  return Math.max(0, prescribed - issued);
}

function findPrescriptionMedicineForLine(
  line: { medicine_id?: string | null },
  index: number,
  prescriptionMedicines: readonly OpdPrescriptionMedicineLine[],
): OpdPrescriptionMedicineLine | undefined {
  const medicineId = line.medicine_id?.trim();
  if (medicineId) {
    const byId = prescriptionMedicines.find((medicine) => medicine.medicine_id === medicineId);
    if (byId) return byId;
  }
  return prescriptionMedicines[index];
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
    prescription_line_no: medicine.line_no,
    prescribed_item_name: prescribedItemLabel(medicine),
    medicine_id: null,
    medicine_display_name: '',
    item_code: '',
    available_qty: '',
    prescribed_quantity: formatDispenseDecimalInput(medicine.quantity),
    quantity_dispensed: '0',
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
  prescriptionMedicines: readonly OpdPrescriptionMedicineLine[] = [],
): DispenseLineDraft[] {
  return lines.map((line, index) => {
    const rxMedicine = findPrescriptionMedicineForLine(line, index, prescriptionMedicines);
    return {
      key: `saved-${index}`,
      prescription_line_no: rxMedicine?.line_no ?? null,
      prescribed_item_name: rxMedicine
        ? prescribedItemLabel(rxMedicine)
        : line.medicine_display_name,
      medicine_id: line.medicine_id ?? null,
      medicine_display_name: line.medicine_display_name,
      item_code: '',
      available_qty: '',
      prescribed_quantity: formatDispenseDecimalInput(line.prescribed_quantity),
      quantity_dispensed: formatDispenseDecimalInput(line.quantity_dispensed),
      unit_amount: formatDispenseDecimalInput(line.unit_amount),
      line_discount: formatDispenseDecimalInput(line.line_discount) || '0',
      tax_percent: formatDispenseDecimalInput(line.tax_percent) || '0',
    };
  });
}

export function draftLinesFromVisitDispense(
  data: {
    has_dispense: boolean;
    lines: Array<{
      medicine_id?: string | null;
      medicine_display_name: string;
      prescribed_quantity: string | null;
      quantity_dispensed: string;
      unit_amount: string;
      line_discount?: string;
      tax_percent?: string;
    }>;
    dispensable_medicines: OpdPrescriptionMedicineLine[];
    opd_prescription: { medicines: OpdPrescriptionMedicineLine[] } | null;
  },
): DispenseLineDraft[] {
  const prescriptionMedicines =
    data.dispensable_medicines.length > 0
      ? data.dispensable_medicines
      : (data.opd_prescription?.medicines ?? []);

  if (data.has_dispense && data.lines.length > 0) {
    return draftLinesFromSaved(data.lines, prescriptionMedicines);
  }

  if (prescriptionMedicines.length > 0) {
    return draftLinesFromPrescription(prescriptionMedicines);
  }

  return [];
}
