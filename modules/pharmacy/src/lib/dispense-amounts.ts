export function multiplyDecimal(quantity: string, unitAmount: string): string {
  const qty = Number(quantity);
  const unit = Number(unitAmount);
  if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty < 0 || unit < 0) {
    return "0.0000";
  }
  return (qty * unit).toFixed(4);
}

export function sumLineTotals(lines: Array<{ line_total: string }>): string {
  let sum = 0;
  for (const line of lines) {
    const value = Number(line.line_total);
    if (Number.isFinite(value) && value >= 0) {
      sum += value;
    }
  }
  return sum.toFixed(4);
}

export function normalizeDiscount(raw: string | null | undefined): string {
  if (raw == null || raw === "") {
    return "0.0000";
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return "0.0000";
  }
  return value.toFixed(4);
}

export function normalizeTaxPercent(raw: string | null | undefined): string {
  if (raw == null || raw === "") {
    return "0.0000";
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return "0.0000";
  }
  return value.toFixed(4);
}

export type LineBillingInput = {
  quantity_dispensed: string;
  unit_amount: string;
  line_discount?: string | null;
  tax_percent?: string | null;
};

/** gross = qty × unit; taxable = max(0, gross − line_discount); tax = taxable × tax%; line_total = taxable + tax. */
export function computeLineBilling(input: LineBillingInput): {
  line_discount: string;
  tax_percent: string;
  tax_amount: string;
  line_total: string;
} {
  const gross = multiplyDecimal(input.quantity_dispensed, input.unit_amount);
  const lineDiscount = normalizeDiscount(input.line_discount);
  const taxPercent = normalizeTaxPercent(input.tax_percent);
  const taxable = Math.max(0, Number(gross) - Number(lineDiscount));
  const taxAmount = taxable * (Number(taxPercent) / 100);
  const lineTotal = taxable + taxAmount;
  return {
    line_discount: lineDiscount,
    tax_percent: taxPercent,
    tax_amount: taxAmount.toFixed(4),
    line_total: lineTotal.toFixed(4),
  };
}

/** subtotal = sum(lines); total_amount = max(0, subtotal - discount). */
export function computeRecordAmounts(
  lineTotals: Array<{ line_total: string }>,
  discountRaw?: string | null,
): { subtotal: string; discount: string; total_amount: string } {
  const subtotal = sumLineTotals(lineTotals);
  const discount = normalizeDiscount(discountRaw);
  const sub = Number(subtotal);
  const disc = Number(discount);
  const total = Math.max(0, sub - disc);
  return {
    subtotal,
    discount,
    total_amount: total.toFixed(4),
  };
}
