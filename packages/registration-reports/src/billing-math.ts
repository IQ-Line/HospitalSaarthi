import type { OPDBillingLineItem } from "./types.js";

export function roundBillingRupee(n: number): number {
  const x = Number.isFinite(n) ? n : 0;
  return Math.round(x * 100) / 100;
}

export function opdBillLevelDiscountGrossRupeePerLine(
  lineItems: OPDBillingLineItem[],
  billLevelDiscount: number,
): number[] {
  const n = lineItems.length;
  const charges = lineItems.map((row) => {
    const qty = Number(row.quantity) || 0;
    const unit = Number(row.unitPrice) || 0;
    return Math.max(0, qty * unit);
  });
  const chargePaise = charges.map((c) => Math.round(c * 100));
  const totalChargePaise = chargePaise.reduce((a, b) => a + b, 0);
  const billDiscRupee = roundBillingRupee(Math.max(0, Number(billLevelDiscount) || 0));
  const billDiscPaise = Math.round(billDiscRupee * 100);

  const discRsAlloc: number[] = [];
  if (billDiscPaise <= 0 || totalChargePaise <= 0) {
    for (let i = 0; i < n; i++) discRsAlloc.push(0);
  } else if (n === 1) {
    discRsAlloc.push(billDiscRupee);
  } else {
    let allocatedPaise = 0;
    for (let i = 0; i < n; i++) {
      if (i === n - 1) {
        discRsAlloc.push(roundBillingRupee(Math.max(0, (billDiscPaise - allocatedPaise) / 100)));
      } else {
        const cp = chargePaise[i]!;
        const sharePaise = Math.floor((billDiscPaise * cp) / totalChargePaise);
        allocatedPaise += sharePaise;
        discRsAlloc.push(roundBillingRupee(sharePaise / 100));
      }
    }
  }
  return discRsAlloc;
}

export function computeOPDBillingSummary(
  lineItems: OPDBillingLineItem[],
  billLevelDiscount: number,
  receivedAmount: number,
) {
  const billDisc = roundBillingRupee(Math.max(0, Number(billLevelDiscount) || 0));
  const alloc = opdBillLevelDiscountGrossRupeePerLine(lineItems, billDisc);

  let subtotal = 0;
  let itemWiseDiscount = 0;
  let taxAmount = 0;
  let sumLineTotals = 0;

  lineItems.forEach((row, i) => {
    const qty = Number(row.quantity) || 0;
    const unit = Number(row.unitPrice) || 0;
    const charge = Math.max(0, qty * unit);
    const lineDisc = Math.max(0, Number(row.discount) || 0);
    const gstPct = Math.max(0, Number(row.gstPercent) || 0);
    const dRs = alloc[i] ?? 0;

    subtotal += charge;
    itemWiseDiscount += lineDisc;

    const taxable = roundBillingRupee(Math.max(0, charge - lineDisc - dRs));
    const tax = roundBillingRupee(taxable * (gstPct / 100));
    taxAmount += tax;
    sumLineTotals += roundBillingRupee(taxable + tax);
  });

  const finalAmount = roundBillingRupee(sumLineTotals);
  return {
    subtotal: roundBillingRupee(subtotal),
    itemWiseDiscount: roundBillingRupee(itemWiseDiscount),
    billLevelDiscount: billDisc,
    taxAmount: roundBillingRupee(taxAmount),
    finalAmount,
    receivedAmount: roundBillingRupee(Math.max(0, Number(receivedAmount) || 0)),
  };
}
