import { describe, expect, it, vi } from "vitest";
import { mockDispenseLine, mockDispenseRecord } from "../test-fixtures/dispense.js";
import {
  DispenseReturnStockRestoreError,
  DispenseReturnValidationError,
  processDispenseReturn,
} from "./process-dispense-return.js";

describe("processDispenseReturn", () => {
  const queueProjectionRepo = {
    updateDispenseStatus: vi.fn(),
  };
  const inventoryGateway = {
    issueDispenseStock: vi.fn(),
    restoreDispenseStock: vi.fn().mockResolvedValue(undefined),
  };

  it("rejects return quantity above eligible quantity", async () => {
    const dispenseReturnRepo = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      getEligibilityContext: vi.fn().mockResolvedValue({
        record: mockDispenseRecord({ id: "dispense-1" }),
        lines: [
          mockDispenseLine({
            id: "line-1",
            dispense_id: "dispense-1",
            quantity_dispensed: "5",
            quantity_returned: "2",
          }),
        ],
        projection: undefined,
      }),
      processReturn: vi.fn(),
    };

    await expect(
      processDispenseReturn(
        { dispenseReturnRepo, queueProjectionRepo, inventoryGateway },
        "tenant-1",
        {
          dispense_id: "dispense-1",
          return_reason: "patient_refused_medicine",
          verification: {
            unopened: true,
            packaging_intact: true,
            expiry_verified: true,
          },
          lines: [{ dispense_line_item_id: "line-1", return_qty: "4" }],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseReturnValidationError);
  });

  it("processes a valid partial return and restores stock by item", async () => {
    const line = mockDispenseLine({
      id: "line-1",
      dispense_id: "dispense-1",
      quantity_dispensed: "10",
      quantity_returned: "0",
      inventory_item_id: "item-1",
    });
    const restoreDispenseStock = vi.fn().mockResolvedValue(undefined);
    const localInventoryGateway = {
      issueDispenseStock: vi.fn(),
      restoreDispenseStock,
    };
    const dispenseReturnRepo = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      getEligibilityContext: vi.fn().mockResolvedValue({
        record: mockDispenseRecord({
          id: "dispense-1",
          visit_id: "visit-1",
          dispense_status: "issued",
          inventory_store_id: "store-1",
        }),
        lines: [line],
        projection: undefined,
      }),
      processReturn: vi.fn().mockResolvedValue({
        id: "return-1",
        return_number: "PH-RT-20260710-0001",
        dispense_id: "dispense-1",
        dispense_number: "DISPENSE1",
        visit_id: "visit-1",
        patient_id: "patient-1",
        patient_name: "Jane Doe",
        uhid: "UHID1",
        formatted_visit_id: "OP001",
        prescription_id: "rx-1",
        return_reason: "patient_refused_medicine",
        remarks: null,
        verification: { unopened: true, packaging_intact: true, expiry_verified: true },
        total_return_amount: "50.0000",
        processed_at: "2026-07-10T12:00:00.000Z",
        processed_by: "user-1",
        processed_by_name: null,
        lines: [],
      }),
    };

    const result = await processDispenseReturn(
      { dispenseReturnRepo, queueProjectionRepo, inventoryGateway: localInventoryGateway },
      "tenant-1",
      {
        dispense_id: "dispense-1",
        return_reason: "patient_refused_medicine",
        verification: {
          unopened: true,
          packaging_intact: true,
          expiry_verified: true,
        },
        lines: [{ dispense_line_item_id: "line-1", return_qty: "5" }],
        processed_by: "user-1",
      },
    );

    expect(result.id).toBe("return-1");
    expect(restoreDispenseStock).toHaveBeenCalledWith("tenant-1", {
      store_id: "store-1",
      lines: [{ item_id: "item-1", quantity: 5 }],
    });
    expect(dispenseReturnRepo.processReturn).toHaveBeenCalledOnce();
    expect(queueProjectionRepo.updateDispenseStatus).toHaveBeenCalledWith(
      "tenant-1",
      "visit-1",
      "partially_returned",
    );
  });

  it("restores stock by lot when dispense line has stock_batch_id", async () => {
    const line = mockDispenseLine({
      id: "line-1",
      dispense_id: "dispense-1",
      quantity_dispensed: "10",
      quantity_returned: "0",
      inventory_item_id: "item-1",
      stock_batch_id: "lot-1",
    });
    const restoreDispenseStock = vi.fn().mockResolvedValue(undefined);
    const localInventoryGateway = {
      issueDispenseStock: vi.fn(),
      restoreDispenseStock,
    };
    const dispenseReturnRepo = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      getEligibilityContext: vi.fn().mockResolvedValue({
        record: mockDispenseRecord({
          id: "dispense-1",
          visit_id: "visit-1",
          dispense_status: "issued",
          inventory_store_id: "store-1",
        }),
        lines: [line],
        projection: undefined,
      }),
      processReturn: vi.fn().mockResolvedValue({
        id: "return-1",
        return_number: "PH-RT-20260710-0001",
        dispense_id: "dispense-1",
        dispense_number: "DISPENSE1",
        visit_id: "visit-1",
        patient_id: "patient-1",
        patient_name: "Jane Doe",
        uhid: "UHID1",
        formatted_visit_id: "OP001",
        prescription_id: "rx-1",
        return_reason: "patient_refused_medicine",
        remarks: null,
        verification: { unopened: true, packaging_intact: true, expiry_verified: true },
        total_return_amount: "50.0000",
        processed_at: "2026-07-10T12:00:00.000Z",
        processed_by: "user-1",
        processed_by_name: null,
        lines: [],
      }),
    };

    await processDispenseReturn(
      { dispenseReturnRepo, queueProjectionRepo, inventoryGateway: localInventoryGateway },
      "tenant-1",
      {
        dispense_id: "dispense-1",
        return_reason: "patient_refused_medicine",
        verification: {
          unopened: true,
          packaging_intact: true,
          expiry_verified: true,
        },
        lines: [{ dispense_line_item_id: "line-1", return_qty: "5" }],
        processed_by: "user-1",
      },
    );

    expect(restoreDispenseStock).toHaveBeenCalledWith("tenant-1", {
      store_id: "store-1",
      lines: [{ item_id: "item-1", quantity: 5, lot_id: "lot-1" }],
    });
  });

  it("skips stock restore when returned lines have no inventory_item_id", async () => {
    const line = mockDispenseLine({
      id: "line-1",
      dispense_id: "dispense-1",
      quantity_dispensed: "10",
      quantity_returned: "0",
      inventory_item_id: null,
    });
    const restoreDispenseStock = vi.fn().mockResolvedValue(undefined);
    const localInventoryGateway = {
      issueDispenseStock: vi.fn(),
      restoreDispenseStock,
    };
    const dispenseReturnRepo = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      getEligibilityContext: vi.fn().mockResolvedValue({
        record: mockDispenseRecord({
          id: "dispense-1",
          visit_id: "visit-1",
          dispense_status: "issued",
          inventory_store_id: null,
        }),
        lines: [line],
        projection: undefined,
      }),
      processReturn: vi.fn().mockResolvedValue({
        id: "return-1",
        return_number: "PH-RT-20260710-0001",
        dispense_id: "dispense-1",
        dispense_number: "DISPENSE1",
        visit_id: "visit-1",
        patient_id: "patient-1",
        patient_name: "Jane Doe",
        uhid: "UHID1",
        formatted_visit_id: "OP001",
        prescription_id: "rx-1",
        return_reason: "patient_refused_medicine",
        remarks: null,
        verification: { unopened: true, packaging_intact: true, expiry_verified: true },
        total_return_amount: "50.0000",
        processed_at: "2026-07-10T12:00:00.000Z",
        processed_by: "user-1",
        processed_by_name: null,
        lines: [],
      }),
    };

    await processDispenseReturn(
      { dispenseReturnRepo, queueProjectionRepo, inventoryGateway: localInventoryGateway },
      "tenant-1",
      {
        dispense_id: "dispense-1",
        return_reason: "patient_refused_medicine",
        verification: {
          unopened: true,
          packaging_intact: true,
          expiry_verified: true,
        },
        lines: [{ dispense_line_item_id: "line-1", return_qty: "5" }],
        processed_by: "user-1",
      },
    );

    expect(restoreDispenseStock).not.toHaveBeenCalled();
  });

  it("fails when stock-backed return lines lack inventory_store_id", async () => {
    const line = mockDispenseLine({
      id: "line-1",
      dispense_id: "dispense-1",
      quantity_dispensed: "10",
      quantity_returned: "0",
      inventory_item_id: "item-1",
    });
    const dispenseReturnRepo = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      getEligibilityContext: vi.fn().mockResolvedValue({
        record: mockDispenseRecord({
          id: "dispense-1",
          inventory_store_id: null,
        }),
        lines: [line],
        projection: undefined,
      }),
      processReturn: vi.fn(),
    };

    await expect(
      processDispenseReturn(
        { dispenseReturnRepo, queueProjectionRepo, inventoryGateway },
        "tenant-1",
        {
          dispense_id: "dispense-1",
          return_reason: "patient_refused_medicine",
          verification: {
            unopened: true,
            packaging_intact: true,
            expiry_verified: true,
          },
          lines: [{ dispense_line_item_id: "line-1", return_qty: "5" }],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseReturnValidationError);
  });

  it("maps inventory restore failures", async () => {
    const { InventoryDispenseStockError } = await import("../lib/http-inventory-gateway.js");
    const line = mockDispenseLine({
      id: "line-1",
      dispense_id: "dispense-1",
      quantity_dispensed: "10",
      quantity_returned: "0",
      inventory_item_id: "item-1",
    });
    const dispenseReturnRepo = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      getEligibilityContext: vi.fn().mockResolvedValue({
        record: mockDispenseRecord({
          id: "dispense-1",
          inventory_store_id: "store-1",
        }),
        lines: [line],
        projection: undefined,
      }),
      processReturn: vi.fn(),
    };
    const localInventoryGateway = {
      issueDispenseStock: vi.fn(),
      restoreDispenseStock: vi.fn().mockRejectedValue(
        new InventoryDispenseStockError("store inactive", 409),
      ),
    };

    await expect(
      processDispenseReturn(
        { dispenseReturnRepo, queueProjectionRepo, inventoryGateway: localInventoryGateway },
        "tenant-1",
        {
          dispense_id: "dispense-1",
          return_reason: "patient_refused_medicine",
          verification: {
            unopened: true,
            packaging_intact: true,
            expiry_verified: true,
          },
          lines: [{ dispense_line_item_id: "line-1", return_qty: "5" }],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseReturnStockRestoreError);
  });
});
