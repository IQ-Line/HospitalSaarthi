import { describe, expect, it, vi } from "vitest";
import {
  extractPrescriptionMedicineId,
  filterDispenseLineRecordsForTenantCatalog,
  filterPrescriptionMedicinesForTenantCatalog,
  normalizeSaveDispenseLinesForCatalog,
} from "./filter-tenant-catalog-medicines.js";
import type { MasterDataGatewayPort } from "../ports.js";

describe("filter-tenant-catalog-medicines", () => {
  it("extracts medicine id from OPD form_data rows", () => {
    expect(extractPrescriptionMedicineId({ medicine_id: "a-b-c" })).toBe("a-b-c");
    expect(extractPrescriptionMedicineId({ medicineId: "d-e-f" })).toBe("d-e-f");
    expect(extractPrescriptionMedicineId({ name: "Paracetamol" })).toBeNull();
  });

  it("keeps only prescription medicines that exist in tenant master catalog", async () => {
    const masterDataGateway: MasterDataGatewayPort = {
      getMedicineById: vi.fn(async (_tenantId, medicineId) => {
        if (medicineId === "med-1") {
          return {
            display_name: "Paracetamol",
            strength_display: "500mg",
            price: 12.5,
            is_active: true,
            is_deleted: false,
          };
        }
        return null;
      }),
    };

    const filtered = await filterPrescriptionMedicinesForTenantCatalog(
      masterDataGateway,
      "tenant-1",
      [
        {
          line_no: 1,
          medicine_id: "med-1",
          name: "Legacy name",
          strength: null,
          dosage: null,
          duration: null,
          frequency: null,
          quantity: "10",
          route: null,
        },
        {
          line_no: 2,
          medicine_id: "missing",
          name: "Unknown",
          strength: null,
          dosage: null,
          duration: null,
          frequency: null,
          quantity: "5",
          route: null,
        },
        {
          line_no: 3,
          medicine_id: null,
          name: "Free text",
          strength: null,
          dosage: null,
          duration: null,
          frequency: null,
          quantity: "1",
          route: null,
        },
      ],
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.medicine_id).toBe("med-1");
    expect(filtered[0]?.name).toBe("Paracetamol");
    expect(filtered[0]?.catalog_unit_price).toBe("12.5000");
  });

  it("filters saved dispense lines without tenant catalog medicine ids", async () => {
    const masterDataGateway: MasterDataGatewayPort = {
      getMedicineById: vi.fn(async (_tenantId, medicineId) =>
        medicineId === "med-2"
          ? {
              display_name: "Azithromycin",
              strength_display: "250mg",
              is_active: true,
              is_deleted: false,
            }
          : null,
      ),
    };

    const filtered = await filterDispenseLineRecordsForTenantCatalog(
      masterDataGateway,
      "tenant-1",
      [
        {
          id: "line-1",
          iq_tenant_id: "tenant-1",
          dispense_record_id: "rec-1",
          medicine_id: "med-2",
          medicine_display_name: "Old label",
          prescribed_quantity: null,
          quantity_dispensed: "1",
          unit_amount: "10",
          line_discount: "0",
          tax_percent: "0",
          tax_amount: "0",
          line_total: "10",
          created_at: new Date(),
        },
        {
          id: "line-2",
          iq_tenant_id: "tenant-1",
          dispense_record_id: "rec-1",
          medicine_id: null,
          medicine_display_name: "Free text",
          prescribed_quantity: null,
          quantity_dispensed: "1",
          unit_amount: "10",
          line_discount: "0",
          tax_percent: "0",
          tax_amount: "0",
          line_total: "10",
          created_at: new Date(),
        },
      ],
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.medicine_display_name).toBe("Azithromycin");
  });

  it("normalizes save lines to catalog display names and rejects unknown ids", async () => {
    const masterDataGateway: MasterDataGatewayPort = {
      getMedicineById: vi.fn(async (_tenantId, medicineId) =>
        medicineId === "med-3"
          ? {
              display_name: "Ibuprofen",
              strength_display: "400mg",
              is_active: true,
              is_deleted: false,
            }
          : null,
      ),
    };

    const normalized = await normalizeSaveDispenseLinesForCatalog(
      masterDataGateway,
      "tenant-1",
      [
        {
          medicine_id: "med-3",
          medicine_display_name: "Typed label",
          quantity_dispensed: "1",
          unit_amount: "5",
        },
      ],
      undefined,
      (index, detail) => {
        throw new Error(`lines[${index}].${detail}`);
      },
    );

    expect(normalized[0]?.medicine_display_name).toBe("Ibuprofen");

    await expect(
      normalizeSaveDispenseLinesForCatalog(
        masterDataGateway,
        "tenant-1",
        [
          {
            medicine_id: "unknown",
            medicine_display_name: "Free text",
            quantity_dispensed: "1",
            unit_amount: "5",
          },
        ],
        undefined,
        (index, detail) => {
          throw new Error(`lines[${index}].${detail}`);
        },
      ),
    ).rejects.toThrow("tenant catalog");
  });
});
