import type { DispenseLineItemRecord, DispenseRecord } from "../domain/pharmacy.types.js";

export function mockDispenseRecord(overrides: Partial<DispenseRecord> = {}): DispenseRecord {
  return {
    id: "rec-1",
    iq_tenant_id: "00000000-0000-0000-0000-000000000001",
    visit_id: "00000000-0000-0000-0000-0000000000bb",
    patient_id: "patient-1",
    opd_prescription_id: "rx-1",
    department_id: null,
    branch_id: null,
    inventory_store_id: null,
    priority: "routine",
    subtotal: "0.0000",
    discount: "0.0000",
    total_amount: "0.0000",
    notes: null,
    dispense_status: "issued",
    dispense_draft_json: {},
    created_at: new Date("2026-06-02T08:00:00.000Z"),
    updated_at: new Date("2026-06-02T08:00:00.000Z"),
    created_by: null,
    ...overrides,
  };
}

export function mockDispenseLine(
  overrides: Partial<DispenseLineItemRecord> = {},
): DispenseLineItemRecord {
  return {
    id: "line-1",
    iq_tenant_id: "00000000-0000-0000-0000-000000000001",
    dispense_id: "rec-1",
    medicine_id: "med-1",
    medicine_display_name: "Paracetamol 500mg",
    opd_prescription_item_id: null,
    opd_prescription_line_no: null,
    prescribed_quantity: null,
    quantity_dispensed: "1",
    quantity_returned: "0",
    unit_amount: "10",
    line_discount: "0.0000",
    tax_percent: "0.0000",
    tax_amount: "0.0000",
    line_total: "10.0000",
    inventory_item_id: null,
    stock_batch_id: null,
    is_substitution: false,
    substitute_of_line_id: null,
    substitution_reason: null,
    line_remarks: null,
    created_at: new Date("2026-06-02T08:00:00.000Z"),
    updated_at: new Date("2026-06-02T08:00:00.000Z"),
    ...overrides,
  };
}
