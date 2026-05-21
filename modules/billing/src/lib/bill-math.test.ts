import { describe, expect, it } from "vitest";
import { computeLineAmounts, rollupBillTotals } from "./bill-math.js";
import type { BillItemRow, BillRow } from "../domain/bill.types.js";

const baseBill: Pick<BillRow, "discount_amount" | "round_off_amount" | "paid_amount"> = {
  discount_amount: "0.0000",
  round_off_amount: "0.0000",
  paid_amount: "0.0000",
};

const item = (gross: string, tax: string): BillItemRow =>
  ({
    status: "ACTIVE",
    gross_amount: gross,
    tax_amount: tax,
    net_amount: gross,
    total_amount: tax === "0.0000" ? gross : `${Number(gross) + Number(tax)}.0000`,
  }) as BillItemRow;

describe("bill-math", () => {
  it("computes line amounts", () => {
    const line = computeLineAmounts("500.0000", 1, "0.0000");
    expect(line.gross_amount).toBe("500.0000");
    expect(line.net_amount).toBe("500.0000");
    expect(line.total_amount).toBe("500.0000");
  });

  it("rolls up bill totals with discount", () => {
    const totals = rollupBillTotals(
      { ...baseBill, discount_amount: "60.0000" },
      [item("100.0000", "0.0000"), item("500.0000", "0.0000")],
    );
    expect(totals.subtotal).toBe("600.0000");
    expect(totals.net_amount).toBe("540.0000");
  });
});
