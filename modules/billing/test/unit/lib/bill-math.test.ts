import { describe, expect, it } from "vitest";
import { computeDeskLineAmounts, computeLineAmounts, rollupBillTotals } from "../../../src/lib/bill-math.js";
import type { BillItemRow, BillRow } from "../../../src/domain/bill.types.js";

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

  it("applies desk tax on net after line discount", () => {
    const line = computeDeskLineAmounts("100.0000", 1, "18.0000", "10.0000");
    expect(line.gross_amount).toBe("100.0000");
    expect(line.discount_amount).toBe("10.0000");
    expect(line.net_amount).toBe("90.0000");
    expect(line.tax_amount).toBe("16.2000");
    expect(line.total_amount).toBe("106.2000");
  });

  it("rolls up bill totals with discount", () => {
    const totals = rollupBillTotals(
      { ...baseBill, discount_amount: "60.0000" },
      [item("100.0000", "0.0000"), item("500.0000", "0.0000")],
    );
    expect(totals.subtotal).toBe("600.0000");
    expect(totals.net_amount).toBe("540.0000");
  });

  it("rolls up subtotal PRE-TAX when tax is non-zero (subtotal != total)", () => {
    // Regression lock for the subtotal-includes-tax defect (P3): with tax, subtotal
    // must be the net sum (100), tax its own field (18), total = subtotal + tax (118).
    const totals = rollupBillTotals(baseBill, [
      item("100.0000", "18.0000"),
      item("200.0000", "36.0000"),
    ]);
    expect(totals.subtotal).toBe("300.0000");
    expect(totals.tax_amount).toBe("54.0000");
    expect(totals.total_amount).toBe("354.0000");
    expect(totals.net_amount).toBe("354.0000"); // no bill-level discount/round-off
  });
});
