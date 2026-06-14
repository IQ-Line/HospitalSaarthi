import { money, moneyAdd, moneyGte, moneyMul, moneySub, moneyTax } from "./money.js";
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

/** Desk line: discount on gross, then tax on the discounted net (matches registration desk UI). */
export function computeDeskLineAmounts(
  unitPrice: string,
  quantity: number,
  taxPct: string,
  lineDiscount: string | number,
): Pick<
  BillItemRow,
  "gross_amount" | "net_amount" | "tax_amount" | "total_amount" | "discount_amount"
> {
  const gross = moneyMul(unitPrice, quantity);
  const discount = money(lineDiscount);
  const net = moneyGte(gross, discount) ? moneySub(gross, discount) : "0.0000";
  const tax = moneyTax(net, taxPct);
  const total = moneyAdd(net, tax);
  return {
    gross_amount: gross,
    tax_amount: tax,
    net_amount: net,
    total_amount: total,
    discount_amount: discount,
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
    subtotal = moneyAdd(subtotal, i.total_amount);
    tax = moneyAdd(tax, i.tax_amount);
  }
  const total = subtotal;
  const net = moneyAdd(moneySub(total, bill.discount_amount), bill.round_off_amount);
  return {
    subtotal,
    tax_amount: tax,
    total_amount: total,
    net_amount: net,
    outstanding_amount: moneySub(net, bill.paid_amount),
  };
}
