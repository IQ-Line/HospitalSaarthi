import { money, moneyAdd, moneyMul, moneySub, moneyTax } from "./money.js";
import type { BillItemRow, BillRow } from "../domain/bill.types.js";

export function computeLineAmounts(
  unitPrice: string,
  quantity: number,
  taxPct: string,
): Pick<BillItemRow, "gross_amount" | "net_amount" | "tax_amount" | "total_amount"> {
  const gross = moneyMul(unitPrice, quantity);
  const net = gross;
  const tax = moneyTax(net, taxPct);
  return {
    gross_amount: gross,
    net_amount: net,
    tax_amount: tax,
    total_amount: moneyAdd(net, tax),
  };
}

export function rollupBillTotals(
  bill: Pick<BillRow, "discount_amount" | "round_off_amount" | "paid_amount">,
  items: BillItemRow[],
): Pick<
  BillRow,
  "subtotal" | "tax_amount" | "total_amount" | "net_amount" | "outstanding_amount"
> {
  const active = items.filter((i) => i.status === "ACTIVE");
  let subtotal = "0.0000";
  let tax = "0.0000";
  for (const i of active) {
    subtotal = moneyAdd(subtotal, i.gross_amount);
    tax = moneyAdd(tax, i.tax_amount);
  }
  const total = moneyAdd(subtotal, tax);
  const net = moneyAdd(moneySub(total, bill.discount_amount), bill.round_off_amount);
  return {
    subtotal,
    tax_amount: tax,
    total_amount: total,
    net_amount: net,
    outstanding_amount: moneySub(net, bill.paid_amount),
  };
}
