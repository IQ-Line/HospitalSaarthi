import type { SaveDispenseLineInput } from "../domain/pharmacy.types.js";
import { computeLineBilling } from "../lib/dispense-amounts.js";
import { dispenseLineItems } from "../schema/tables.js";

export function buildDispenseLineRows(
  tenantId: string,
  recordId: string,
  lines: SaveDispenseLineInput[],
): Array<typeof dispenseLineItems.$inferInsert> {
  return lines.map((line) => {
    const billing = computeLineBilling({
      quantity_dispensed: line.quantity_dispensed,
      unit_amount: line.unit_amount,
      line_discount: line.line_discount,
      tax_percent: line.tax_percent,
    });
    return {
      iq_tenant_id: tenantId,
      dispense_id: recordId,
      medicine_id: line.medicine_id ?? null,
      medicine_display_name: line.medicine_display_name.trim(),
      prescribed_quantity: line.prescribed_quantity ?? null,
      quantity_dispensed: line.quantity_dispensed,
      unit_amount: line.unit_amount,
      line_discount: billing.line_discount,
      tax_percent: billing.tax_percent,
      tax_amount: billing.tax_amount,
      line_total: billing.line_total,
    };
  });
}
