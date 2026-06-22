import { describe, expect, it } from "vitest";
import { computeLineBilling, computeRecordAmounts } from "../../../src/lib/dispense-amounts.js";

describe("computeLineBilling", () => {
  it("computes qty × unit when no discount or tax", () => {
    expect(
      computeLineBilling({
        quantity_dispensed: "9",
        unit_amount: "2.5",
      }),
    ).toEqual({
      line_discount: "0.0000",
      tax_percent: "0.0000",
      tax_amount: "0.0000",
      line_total: "22.5000",
    });
  });

  it("applies line discount before tax", () => {
    expect(
      computeLineBilling({
        quantity_dispensed: "10",
        unit_amount: "10",
        line_discount: "20",
        tax_percent: "12",
      }),
    ).toEqual({
      line_discount: "20.0000",
      tax_percent: "12.0000",
      tax_amount: "9.6000",
      line_total: "89.6000",
    });
  });
});

describe("computeRecordAmounts", () => {
  it("subtracts bill discount from subtotal of line totals", () => {
    expect(
      computeRecordAmounts([{ line_total: "89.6000" }, { line_total: "22.5000" }], "2"),
    ).toEqual({
      subtotal: "112.1000",
      discount: "2.0000",
      total_amount: "110.1000",
    });
  });
});
