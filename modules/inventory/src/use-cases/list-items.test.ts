import { describe, expect, it, vi } from "vitest";
import { listItems } from "./list-items.js";

describe("listItems for_dispense", () => {
  it("returns medicine item-master rows linked to formulary with pricing", async () => {
    const itemRepo = {
      list: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "item-1",
            item_code: "MED-001",
            name: "Dolo",
            display_name: "Dolo 650mg",
            tenant_formulary_id: "form-1",
            available_qty: "24",
            supply_attributes: {
              pharmacy: { mrp: 50 },
              hsnSelections: [{ cgst_pct: 6, sgst_pct: 6, igst_pct: 12 }],
            },
          },
          {
            id: "item-2",
            item_code: "INV-001",
            name: "Gloves",
            display_name: "Gloves",
            tenant_formulary_id: null,
            available_qty: "10",
            supply_attributes: {},
          },
        ],
        total: 2,
      }),
    };

    const result = await listItems({ itemRepo: itemRepo as never }, "tenant-1", {
      for_dispense: true,
      store_id: "store-1",
      limit: 15,
      offset: 0,
    });

    expect(itemRepo.list).toHaveBeenCalledWith("tenant-1", {
      search: undefined,
      isActive: true,
      categoryId: undefined,
      itemClassification: "medicine",
      linkedToFormulary: true,
      storeId: "store-1",
      limit: 15,
      offset: 0,
    });
    expect(result.data).toEqual([
      {
        id: "item-1",
        item_code: "MED-001",
        display_name: "Dolo 650mg",
        tenant_formulary_id: "form-1",
        mrp: "50",
        gst_percent: "12",
        available_qty: "24",
      },
    ]);
    expect(result.total).toBe(2);
  });

  it("returns empty dispense list when store_id is missing", async () => {
    const itemRepo = {
      list: vi.fn(),
    };

    const result = await listItems({ itemRepo: itemRepo as never }, "tenant-1", {
      for_dispense: true,
      limit: 15,
      offset: 0,
    });

    expect(itemRepo.list).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], total: 0 });
  });

  it("includes formulary link and pricing on generic medicine rows", async () => {
    const itemRepo = {
      list: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "item-1",
            item_code: "MED-001",
            name: "Dolo",
            display_name: "Dolo 650mg",
            item_classification: "medicine",
            item_type_id: "type-1",
            category_id: "cat-1",
            manufacturer_id: "mfr-1",
            is_active: true,
            unit_of_measure: "tab",
            tracking_mode: "lot",
            is_expirable: true,
            tenant_formulary_id: "form-1",
            supply_attributes: {
              pharmacy: { mrp: 50 },
              hsnSelections: [{ cgst_pct: 6, sgst_pct: 6, igst_pct: 12 }],
            },
          },
        ],
        total: 1,
      }),
    };

    const result = await listItems({ itemRepo: itemRepo as never }, "tenant-1", {
      limit: 50,
      offset: 0,
    });

    expect(result.data[0]).toMatchObject({
      id: "item-1",
      tenant_formulary_id: "form-1",
      mrp: "50",
      gst_percent: "12",
    });
  });
});
