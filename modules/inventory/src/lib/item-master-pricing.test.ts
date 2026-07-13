import { describe, expect, it } from "vitest";
import {
  extractItemMasterPricing,
  gstPercentFromSupplyAttributes,
  mrpFromSupplyAttributes,
} from "./item-master-pricing.js";

describe("item-master-pricing", () => {
  it("reads MRP from pharmacy supply attributes", () => {
    expect(
      mrpFromSupplyAttributes({
        pharmacy: { mrp: 125.5 },
      }),
    ).toBe("125.5");
  });

  it("sums CGST and SGST for GST percent", () => {
    expect(
      gstPercentFromSupplyAttributes({
        hsnSelections: [{ cgst_pct: 6, sgst_pct: 6, igst_pct: 12 }],
      }),
    ).toBe("12");
  });

  it("falls back to IGST when CGST/SGST are zero", () => {
    expect(
      gstPercentFromSupplyAttributes({
        hsnSelections: [{ cgst_pct: 0, sgst_pct: 0, igst_pct: 18 }],
      }),
    ).toBe("18");
  });

  it("reads GST from snake_case hsn_selections", () => {
    expect(
      gstPercentFromSupplyAttributes({
        hsn_selections: [{ cgst_pct: 9, sgst_pct: 9, igst_pct: 18 }],
      }),
    ).toBe("18");
  });

  it("reads MRP from top-level supply attribute", () => {
    expect(mrpFromSupplyAttributes({ mrp: 42.25 })).toBe("42.25");
  });

  it("builds pricing snapshot from inventory item row", () => {
    expect(
      extractItemMasterPricing({
        id: "item-1",
        item_code: "MED-001",
        supply_attributes: {
          pharmacy: { mrp: 99 },
          hsnSelections: [{ cgst_pct: 2.5, sgst_pct: 2.5, igst_pct: 5 }],
        },
      }),
    ).toEqual({
      item_id: "item-1",
      item_code: "MED-001",
      mrp: "99",
      gst_percent: "5",
    });
  });
});
