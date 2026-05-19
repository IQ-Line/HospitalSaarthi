import type { BillItemRow, BillRow } from "../domain/bill.types.js";

export function renderReceiptHtml(bill: BillRow, items: BillItemRow[]): string {
  const lines = items
    .filter((i) => i.status === "ACTIVE")
    .map((i) => `${i.item_code} ${i.description} x${i.quantity} @ ${i.unit_price} = ${i.total_amount}`)
    .join("\n");
  return `<!DOCTYPE html><html><body>
<h1>Receipt ${bill.bill_number}</h1>
<p>Status: ${bill.status} | Net: ${bill.net_amount} | Paid: ${bill.paid_amount}</p>
<pre>${lines}</pre>
</body></html>`;
}
