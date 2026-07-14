import { multiplyDecimal } from "./dispense-amounts.js";

function proportionalAmount(total: string, partQty: number, wholeQty: number): string {
  const whole = Number(wholeQty);
  const totalNum = Number(total);
  if (!Number.isFinite(whole) || whole <= 0 || !Number.isFinite(totalNum) || totalNum <= 0) {
    return "0.0000";
  }
  if (!Number.isFinite(partQty) || partQty <= 0) {
    return "0.0000";
  }
  return ((totalNum * partQty) / whole).toFixed(4);
}

export type LineReturnAmountInput = {
  quantity_dispensed: string;
  unit_amount: string;
  line_discount: string;
  tax_amount: string;
};

export type LineReturnAmountResult = {
  line_discount: string;
  tax_amount: string;
  return_amount: string;
};

/** Proportional return amount from original dispense line billing. */
export function computeLineReturnAmount(
  line: LineReturnAmountInput,
  returnQty: number,
): LineReturnAmountResult {
  const dispensedQty = Number(line.quantity_dispensed);
  if (!Number.isFinite(returnQty) || returnQty <= 0 || !Number.isFinite(dispensedQty) || dispensedQty <= 0) {
    return { line_discount: "0.0000", tax_amount: "0.0000", return_amount: "0.0000" };
  }

  const returnGross = multiplyDecimal(String(returnQty), line.unit_amount);
  const lineDiscount = proportionalAmount(line.line_discount, returnQty, dispensedQty);
  const taxAmount = proportionalAmount(line.tax_amount, returnQty, dispensedQty);
  const returnAmount = Math.max(
    0,
    Number(returnGross) - Number(lineDiscount) + Number(taxAmount),
  ).toFixed(4);

  return {
    line_discount: lineDiscount,
    tax_amount: taxAmount,
    return_amount: returnAmount,
  };
}

export function sumReturnAmounts(lines: Array<{ return_amount: string }>): string {
  let sum = 0;
  for (const line of lines) {
    const value = Number(line.return_amount);
    if (Number.isFinite(value) && value >= 0) {
      sum += value;
    }
  }
  return sum.toFixed(4);
}

export function eligibleReturnQty(quantityDispensed: string, quantityReturned: string): string {
  const dispensed = Number(quantityDispensed);
  const returned = Number(quantityReturned);
  if (!Number.isFinite(dispensed) || dispensed <= 0) {
    return "0";
  }
  const eligible = Math.max(0, dispensed - (Number.isFinite(returned) ? returned : 0));
  return String(eligible);
}
