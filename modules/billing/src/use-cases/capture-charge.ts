import { computeDeskLineAmounts, computeLineAmounts } from "../lib/bill-math.js";
import { money } from "../lib/money.js";
import { fail, ok, syncBillTotals } from "../lib/use-case.js";
import type { CaptureChargeInput, ChargeIngestResponse, UseCaseResult } from "../domain/bill.types.js";
import type { BillingDeps } from "../ports.js";
import { newDraftBill } from "../data-access/billing.repository.js";

/**
 * True when the input carries a desk price / discount override — a unit-price, tax, or
 * line-discount value that departs from the catalog tariff. Submitting any of these requires
 * the `invoice:invoice:override-price` capability, enforced by the caller via `canOverridePrice`.
 */
export function hasDeskPricingOverrides(input: CaptureChargeInput): boolean {
  return (
    input.unit_price_override != null ||
    input.tax_percentage_override != null ||
    (input.line_discount_amount != null && Number(input.line_discount_amount) > 0) ||
    (input.line_discount_percentage != null && Number(input.line_discount_percentage) > 0)
  );
}

const toResponse = (
  item: {
    id: string;
    bill_id: string;
    unit_price: string;
    tax_percentage: string;
    description: string;
    gross_amount: string;
    tax_amount: string;
    net_amount: string;
  },
  replayed: boolean,
): ChargeIngestResponse => ({
  bill_item_id: item.id,
  bill_id: item.bill_id,
  snapshotted_unit_price: item.unit_price,
  snapshotted_tax_percentage: item.tax_percentage,
  snapshotted_description: item.description,
  gross_amount: item.gross_amount,
  tax_amount: item.tax_amount,
  net_amount: item.net_amount,
  replayed,
});

function resolveLineDiscount(
  input: CaptureChargeInput,
  unitPrice: string,
  qty: number,
): { discount_amount: string; discount_percentage: string } {
  const pct = Number(input.line_discount_percentage ?? 0);
  const explicitAmt = Number(input.line_discount_amount ?? 0);
  let discountAmt = explicitAmt;
  if (discountAmt <= 0 && pct > 0) {
    const gross = Number(unitPrice) * qty;
    discountAmt = Math.round(gross * pct / 100);
  }
  return {
    discount_amount: money(discountAmt),
    discount_percentage: pct > 0 ? money(pct) : "0.0000",
  };
}

function lineAmounts(input: CaptureChargeInput, tariff: { base_price: string; tax_percentage: string }, qty: number) {
  const unitPrice =
    input.unit_price_override != null ? money(input.unit_price_override) : tariff.base_price;
  const taxPct =
    input.tax_percentage_override != null ? money(input.tax_percentage_override) : tariff.tax_percentage;
  const { discount_amount: resolvedDiscount, discount_percentage } = resolveLineDiscount(
    input,
    unitPrice,
    qty,
  );
  const desk =
    input.unit_price_override != null ||
    input.tax_percentage_override != null ||
    Number(resolvedDiscount) > 0 ||
    Number(discount_percentage) > 0;
  const deskAmounts = desk
    ? computeDeskLineAmounts(unitPrice, qty, taxPct, resolvedDiscount)
    : null;
  const amounts = deskAmounts ?? computeLineAmounts(unitPrice, qty, taxPct);
  return {
    unitPrice,
    taxPct,
    amounts,
    discount_amount: deskAmounts?.discount_amount ?? resolvedDiscount,
    discount_percentage,
  };
}

export interface CaptureChargeOptions {
  idempotencyKey?: string;
  /**
   * Whether the caller is authorized to submit desk price/discount overrides — the
   * `invoice:invoice:override-price` Cerbos decision, resolved by the HTTP handler. Defaults
   * to `false` (fail-closed): an override attempt without authorization is rejected.
   */
  canOverridePrice?: boolean;
}

export async function captureCharge(
  deps: BillingDeps,
  tenantId: string,
  input: CaptureChargeInput,
  options: CaptureChargeOptions = {},
): Promise<UseCaseResult<ChargeIngestResponse>> {
  const { idempotencyKey, canOverridePrice = false } = options;

  if (!input.patient_id) return fail("VALIDATION", "patient_id is required");
  if (!input.item_code?.trim()) return fail("VALIDATION", "item_code is required");
  if (!input.source_module?.trim()) return fail("VALIDATION", "source_module is required");

  if (hasDeskPricingOverrides(input) && !canOverridePrice) {
    return fail(
      "FORBIDDEN",
      "desk_price_overrides_forbidden: caller lacks the invoice:invoice:override-price capability",
    );
  }

  const qty = Number(input.quantity ?? 1);
  if (!Number.isFinite(qty) || qty <= 0) return fail("VALIDATION", "quantity must be > 0");

  if (idempotencyKey) {
    const existing = await deps.billingRepo.findItemByIdempotency(tenantId, idempotencyKey);
    if (existing) return ok(toResponse(existing, true));
  }

  const providerId = input.provider_id ?? null;
  const tariff = await deps.tariffRepo.findByCodeAndProvider(tenantId, input.item_code, providerId);
  if (!tariff) {
    return fail("NOT_FOUND", "catalog_row_not_found: no active tariff for service_code and provider");
  }

  const visitId = input.visit_id ?? null;
  const bill =
    (await deps.billingRepo.findDraftBill(tenantId, input.patient_id, visitId)) ??
    (await deps.billingRepo.createBill(
      newDraftBill(tenantId, input.patient_id, visitId, input.visit_type ?? "OPD"),
    ));

  const { unitPrice, taxPct, amounts, discount_amount, discount_percentage } = lineAmounts(
    input,
    tariff,
    qty,
  );

  const item = await deps.billingRepo.insertItem({
    iq_tenant_id: tenantId,
    bill_id: bill.id,
    service_id: tariff.id,
    item_type: "SERVICE",
    item_code: tariff.service_code,
    description: tariff.service_name,
    quantity: qty.toFixed(2),
    unit_price: unitPrice,
    discount_percentage,
    discount_amount,
    ...amounts,
    tax_percentage: taxPct,
    source_module: input.source_module,
    source_ref: input.source_ref ?? null,
    performed_date: input.performed_date ?? new Date().toISOString(),
    performed_by: input.performed_by ?? providerId,
    department: input.department ?? tariff.department_id,
    status: "ACTIVE",
    idempotency_key: idempotencyKey ?? null,
    notes: input.notes ?? null,
  });

  await syncBillTotals(deps.billingRepo, tenantId, bill);
  return ok(toResponse(item, false));
}
