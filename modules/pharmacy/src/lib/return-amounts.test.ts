import { describe, expect, it } from "vitest";
import {
  computeLineReturnAmount,
  eligibleReturnQty,
  sumReturnAmounts,
} from "./return-amounts.js";

describe("return-amounts", () => {
  it("computes proportional return amount with discount and tax", () => {
    const result = computeLineReturnAmount(
      {
        quantity_dispensed: "10",
        unit_amount: "100.0000",
        line_discount: "50.0000",
        tax_amount: "54.0000",
      },
      5,
    );
    expect(result.line_discount).toBe("25.0000");
    expect(result.tax_amount).toBe("27.0000");
    expect(result.return_amount).toBe("502.0000");
  });

  it("calculates eligible return quantity", () => {
    expect(eligibleReturnQty("10", "3")).toBe("7");
    expect(eligibleReturnQty("10", "10")).toBe("0");
  });

  it("sums return amounts", () => {
    expect(
      sumReturnAmounts([{ return_amount: "10.0000" }, { return_amount: "5.5000" }]),
    ).toBe("15.5000");
  });
});
