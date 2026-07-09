import type { CreateGrnLineInput } from "./grn.types.js";
import { GrnValidationError } from "../errors.js";

/** Item row fields required for GRN line validation (aligned with hims-backend + iqhealth). */
export type GrnValidationItemRef = {
  id: string;
  item_code: string;
  tracking_mode: string;
  is_expirable: boolean;
  is_active: boolean;
};

export function itemRequiresBatch(item: Pick<GrnValidationItemRef, "tracking_mode">): boolean {
  return item.tracking_mode === "lot";
}

export function itemRequiresExpiry(item: Pick<GrnValidationItemRef, "is_expirable">): boolean {
  return item.is_expirable === true;
}

export function assertGrnDateNotFuture(grnDate: string): void {
  const today = new Date().toISOString().slice(0, 10);
  if (grnDate > today) {
    throw new GrnValidationError("GRN date cannot be in the future");
  }
}

/** GRN must be linked to a procurement indent before submit. */
export function assertIndentLinkedForSubmit(
  inventoryIndentId: string | null | undefined,
): void {
  if (!inventoryIndentId?.trim()) {
    throw new GrnValidationError("Indent number is required for GRN");
  }
}

export function assertPurchaseHeader(
  grnType: "purchase" | "transfer",
  _manufacturerId: string | null | undefined,
  voucherInvoiceNo: string | undefined,
): void {
  if (grnType !== "purchase") return;
  if (!voucherInvoiceNo?.trim()) {
    throw new GrnValidationError("Voucher / invoice number is required for purchase GRN");
  }
}

export function assertLineAgainstItem(
  item: GrnValidationItemRef,
  line: Pick<
    CreateGrnLineInput,
    "grn_qty" | "purchase_rate" | "lot_number" | "expiry_date" | "requested_qty"
  >,
): void {
  if (!item.is_active) {
    throw new GrnValidationError(`Item ${item.item_code} is not active`);
  }
  if (line.grn_qty <= 0) {
    throw new GrnValidationError(`GRN quantity must be > 0 for item ${item.item_code}`);
  }
  if (line.purchase_rate <= 0) {
    throw new GrnValidationError(`Purchase rate must be > 0 for item ${item.item_code}`);
  }
  if (line.requested_qty != null && line.grn_qty > line.requested_qty) {
    throw new GrnValidationError(
      `GRN quantity cannot exceed requested quantity for item ${item.item_code}`,
    );
  }
  if (itemRequiresBatch(item) && !line.lot_number?.trim()) {
    throw new GrnValidationError(`Batch / lot number is required for item ${item.item_code}`);
  }
  if (itemRequiresExpiry(item)) {
    if (!line.expiry_date) {
      throw new GrnValidationError(`Expiry date is required for item ${item.item_code}`);
    }
    const today = new Date().toISOString().slice(0, 10);
    if (line.expiry_date <= today) {
      throw new GrnValidationError(`Expiry date must be in the future for item ${item.item_code}`);
    }
  }
}
