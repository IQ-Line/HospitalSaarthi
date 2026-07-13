import { computeDispenseTotals, multiplyDecimal } from './dispense-billing';
import type { DispenseLineDraft, SaveDispenseLineInput } from '../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DispenseLineFieldErrors = {
  medicine?: string;
  prescribed_quantity?: string;
  quantity_dispensed?: string;
  unit_amount?: string;
  line_discount?: string;
  tax_percent?: string;
};

export type DispenseDraftValidationResult = {
  isValid: boolean;
  lineErrors: Record<string, DispenseLineFieldErrors>;
  discountError?: string;
  formError?: string;
};

function parseNonNegativeNumber(raw: string, label: string): number | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: `${label} is required.` };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return { error: `${label} must be a non-negative number.` };
  }
  return value;
}

function parsePositiveNumber(raw: string, label: string): number | { error: string } {
  const parsed = parseNonNegativeNumber(raw, label);
  if (typeof parsed !== 'number') return parsed;
  if (parsed <= 0) {
    return { error: `${label} must be greater than zero.` };
  }
  return parsed;
}

export function dispenseLineHasDraftContent(line: DispenseLineDraft): boolean {
  if (line.medicine_id) return true;
  if (line.medicine_display_name.trim()) return true;
  if (line.prescribed_item_name.trim()) return true;
  if (line.prescribed_quantity.trim()) return true;
  if (line.quantity_dispensed.trim() && line.quantity_dispensed.trim() !== '1') return true;
  if (line.unit_amount.trim() && line.unit_amount.trim() !== '0') return true;
  if (line.line_discount.trim() && line.line_discount.trim() !== '0') return true;
  if (line.tax_percent.trim() && line.tax_percent.trim() !== '0') return true;
  return false;
}

function validateDispenseLine(line: DispenseLineDraft): DispenseLineFieldErrors {
  const errors: DispenseLineFieldErrors = {};

  const medicineId = line.medicine_id?.trim();
  if (!medicineId || !UUID_RE.test(medicineId)) {
    errors.medicine = 'Choose a medicine item from the item master.';
  } else if (!line.medicine_display_name.trim()) {
    errors.medicine = 'Medicine name is required.';
  }

  const qty = parsePositiveNumber(line.quantity_dispensed, 'Dispensed quantity');
  if (typeof qty !== 'number') {
    errors.quantity_dispensed = qty.error;
  }

  const unit = parseNonNegativeNumber(line.unit_amount, 'Unit price');
  if (typeof unit !== 'number') {
    errors.unit_amount = unit.error;
  }

  if (line.line_discount.trim()) {
    const lineDiscount = parseNonNegativeNumber(line.line_discount, 'Line discount');
    if (typeof lineDiscount !== 'number') {
      errors.line_discount = lineDiscount.error;
    } else if (typeof qty === 'number' && typeof unit === 'number') {
      const gross = multiplyDecimal(line.quantity_dispensed, line.unit_amount);
      if (lineDiscount > gross) {
        errors.line_discount = 'Line discount cannot exceed line amount.';
      }
    }
  }

  if (line.tax_percent.trim()) {
    const taxPercent = parseNonNegativeNumber(line.tax_percent, 'Tax');
    if (typeof taxPercent !== 'number') {
      errors.tax_percent = taxPercent.error;
    }
  }

  if (line.prescribed_quantity.trim()) {
    const prescribed = parseNonNegativeNumber(line.prescribed_quantity, 'Prescribed quantity');
    if (typeof prescribed !== 'number') {
      errors.prescribed_quantity = prescribed.error;
    }
  }

  return errors;
}

export function validateDispenseDraft(
  lines: readonly DispenseLineDraft[],
  discountRaw: string,
): DispenseDraftValidationResult {
  const lineErrors: Record<string, DispenseLineFieldErrors> = {};
  const saveLines: DispenseLineDraft[] = [];

  for (const line of lines) {
    if (!line.medicine_id && !dispenseLineHasDraftContent(line)) {
      continue;
    }

    if (line.medicine_id) {
      saveLines.push(line);
    }

    const errors = validateDispenseLine(line);
    if (Object.keys(errors).length > 0) {
      lineErrors[line.key] = errors;
    }
  }

  if (saveLines.length === 0) {
    return {
      isValid: false,
      lineErrors,
      formError: 'Add at least one medicine item from the item master.',
    };
  }

  let discountError: string | undefined;
  const discountTrimmed = discountRaw.trim() || '0';
  const discountValue = Number(discountTrimmed);
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    discountError = 'Bill discount must be a non-negative number.';
  } else {
    const totals = computeDispenseTotals(saveLines, discountTrimmed);
    if (discountValue > Number(totals.subtotal)) {
      discountError = 'Bill discount cannot exceed subtotal.';
    }
  }

  const isValid = Object.keys(lineErrors).length === 0 && !discountError;

  return {
    isValid,
    lineErrors,
    discountError,
  };
}

export function buildSaveDispenseLinesFromDraft(
  lines: readonly DispenseLineDraft[],
): SaveDispenseLineInput[] {
  return lines
    .filter((line): line is DispenseLineDraft & { medicine_id: string } => Boolean(line.medicine_id))
    .map((line) => ({
      medicine_id: line.medicine_id,
      medicine_display_name: line.medicine_display_name.trim(),
      prescribed_quantity: line.prescribed_quantity.trim() || null,
      quantity_dispensed: line.quantity_dispensed.trim(),
      unit_amount: line.unit_amount.trim(),
      line_discount: line.line_discount.trim() || '0',
      tax_percent: line.tax_percent.trim() || '0',
    }));
}

export function firstDispenseValidationMessage(result: DispenseDraftValidationResult): string {
  if (result.formError) return result.formError;
  if (result.discountError) return result.discountError;

  for (const errors of Object.values(result.lineErrors)) {
    for (const message of Object.values(errors)) {
      if (message) return message;
    }
  }

  return 'Fix validation errors before saving.';
}
