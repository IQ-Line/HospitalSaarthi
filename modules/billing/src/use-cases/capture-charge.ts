import { computeDeskLineAmounts, computeLineAmounts } from "../lib/bill-math.js";
import { money } from "../lib/money.js";
import { fail, ok, syncBillTotals } from "../lib/use-case.js";
import type { CaptureChargeInput, ChargeIngestResponse, UseCaseResult } from "../domain/bill.types.js";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import type { BillingDeps } from "../ports.js";
import { newDraftBill } from "../data-access/billing.repository.js";

const DESK_NAMES: Record<string, string> = {
  REG_FEE: "Registration Fee",
  CONS_GENERAL: "General Consultation",
};

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

function deskTariff(tenantId: string, input: CaptureChargeInput): TariffMasterRow {
  const code = input.item_code.trim();
  const now = new Date().toISOString();
  return {
    id: "",
    iq_tenant_id: tenantId,
    service_code: code,
    service_name: DESK_NAMES[code] ?? code,
    description: null,
    provider_id: input.provider_id ?? null,
    department: code === "REG_FEE" ? "frontdesk" : "opd",
    category: null,
    sub_category: null,
    tax_type: null,
    base_price: money(input.unit_price_override!),
    tax_percentage: money(input.tax_percentage_override ?? 0),
    is_active: true,
    effective_from: now,
    effective_to: null,
    created_at: now,
    updated_at: now,
    created_by: null,
    updated_by: null,
  };
}

function lineAmounts(input: CaptureChargeInput, tariff: TariffMasterRow, qty: number) {
  const unitPrice =
    input.unit_price_override != null && input.unit_price_override !== ""
      ? money(input.unit_price_override)
      : tariff.base_price;
  const taxPct =
    input.tax_percentage_override != null && input.tax_percentage_override !== ""
      ? money(input.tax_percentage_override)
      : tariff.tax_percentage;
  const desk =
    input.unit_price_override != null ||
    input.tax_percentage_override != null ||
    Number(input.line_discount_amount ?? 0) > 0;
  const amounts = desk
    ? computeDeskLineAmounts(unitPrice, qty, taxPct, input.line_discount_amount ?? 0)
    : computeLineAmounts(unitPrice, qty, taxPct);
  return {
    unitPrice,
    taxPct,
    amounts,
    discount_amount: amounts.discount_amount ?? "0.0000",
  };
}

export async function captureCharge(
  deps: BillingDeps,
  tenantId: string,
  input: CaptureChargeInput,
  idempotencyKey?: string,
): Promise<UseCaseResult<ChargeIngestResponse>> {
  if (!input.patient_id) return fail("VALIDATION", "patient_id is required");
  if (!input.item_code?.trim()) return fail("VALIDATION", "item_code is required");
  if (!input.source_module?.trim()) return fail("VALIDATION", "source_module is required");

  const qty = Number(input.quantity ?? 1);
  if (!Number.isFinite(qty) || qty <= 0) return fail("VALIDATION", "quantity must be > 0");

  if (idempotencyKey) {
    const existing = await deps.billingRepo.findItemByIdempotency(tenantId, idempotencyKey);
    if (existing) return ok(toResponse(existing, true));
  }

  const providerId = input.provider_id ?? null;
  let tariff = await deps.tariffRepo.findByCodeAndProvider(tenantId, input.item_code, providerId);
  const hasDeskPrice =
    input.unit_price_override != null && input.unit_price_override !== "";
  if (!tariff && hasDeskPrice) tariff = deskTariff(tenantId, input);
  if (!tariff) {
    return fail("NOT_FOUND", "catalog_row_not_found: no active tariff for service_code and provider");
  }

  const visitId = input.visit_id ?? null;
  const bill =
    (await deps.billingRepo.findDraftBill(tenantId, input.patient_id, visitId)) ??
    (await deps.billingRepo.createBill(
      newDraftBill(tenantId, input.patient_id, visitId, input.visit_type ?? "OPD"),
    ));

  const { unitPrice, taxPct, amounts, discount_amount } = lineAmounts(input, tariff, qty);

  const item = await deps.billingRepo.insertItem({
    iq_tenant_id: tenantId,
    bill_id: bill.id,
    service_id: tariff.id || null,
    item_type: "SERVICE",
    item_code: tariff.service_code,
    description: tariff.service_name,
    quantity: qty.toFixed(2),
    unit_price: unitPrice,
    discount_percentage: "0.0000",
    discount_amount,
    ...amounts,
    tax_percentage: taxPct,
    source_module: input.source_module,
    source_ref: input.source_ref ?? null,
    performed_date: input.performed_date ?? new Date().toISOString(),
    performed_by: input.performed_by ?? providerId,
    department: input.department ?? tariff.department,
    status: "ACTIVE",
    idempotency_key: idempotencyKey ?? null,
    notes: input.notes ?? null,
  });

  await syncBillTotals(deps.billingRepo, tenantId, bill);
  return ok(toResponse(item, false));
}
