import type { DispenseReturnEligibilityResponse } from "../domain/pharmacy.types.js";
import { formatDispenseNumber } from "../lib/format-dispense-number.js";
import { eligibleReturnQty } from "../lib/return-amounts.js";
import type { DispenseReturnRepo, UserLookupPort } from "../ports.js";

export class DispenseReturnNotEligibleError extends Error {
  constructor(message = "Dispense transaction is not eligible for return") {
    super(message);
    this.name = "DispenseReturnNotEligibleError";
  }
}

export async function getDispenseReturnEligibility(
  deps: { dispenseReturnRepo: DispenseReturnRepo; userLookup: UserLookupPort },
  tenantId: string,
  dispenseId: string,
): Promise<DispenseReturnEligibilityResponse> {
  const context = await deps.dispenseReturnRepo.getEligibilityContext(tenantId, dispenseId);
  if (!context) {
    throw new DispenseReturnNotEligibleError();
  }

  const pharmacistIds = context.record.created_by ? [context.record.created_by] : [];
  const pharmacistNames =
    pharmacistIds.length > 0
      ? await deps.userLookup.resolveDoctorNames(tenantId, pharmacistIds)
      : new Map<string, string>();

  const lines = context.lines
    .filter((line) => Number(line.quantity_dispensed) > 0)
    .map((line) => ({
      dispense_line_item_id: line.id,
      medicine_id: line.medicine_id,
      medicine_display_name: line.medicine_display_name,
      stock_batch_id: line.stock_batch_id,
      batch_number: line.stock_batch_id ? line.stock_batch_id.slice(0, 8).toUpperCase() : null,
      expiry_date: null,
      quantity_dispensed: line.quantity_dispensed,
      quantity_returned: line.quantity_returned,
      eligible_return_qty: eligibleReturnQty(line.quantity_dispensed, line.quantity_returned),
      unit_amount: line.unit_amount,
      line_discount: line.line_discount,
      tax_percent: line.tax_percent,
      tax_amount: line.tax_amount,
      line_total: line.line_total,
    }))
    .filter((line) => Number(line.eligible_return_qty) > 0);

  if (lines.length === 0) {
    throw new DispenseReturnNotEligibleError("All medicines on this dispense have been fully returned");
  }

  const pharmacistId = context.record.created_by;
  return {
    dispense_id: context.record.id,
    dispense_number: formatDispenseNumber(context.record.id),
    visit_id: context.record.visit_id,
    patient_id: context.record.patient_id,
    patient_name: context.projection?.patient_name ?? null,
    uhid: context.projection?.uhid ?? null,
    formatted_visit_id: context.projection?.formatted_visit_id ?? null,
    prescription_id: context.record.opd_prescription_id ?? context.projection?.prescription_id ?? null,
    dispense_date: context.record.created_at.toISOString(),
    dispense_status: context.record.dispense_status,
    total_amount: context.record.total_amount,
    inventory_store_id: context.record.inventory_store_id,
    pharmacist_id: pharmacistId,
    pharmacist_name: pharmacistId ? (pharmacistNames.get(pharmacistId) ?? null) : null,
    lines,
  };
}
