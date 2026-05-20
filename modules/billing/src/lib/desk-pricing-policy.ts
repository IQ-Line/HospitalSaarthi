import type { CaptureChargeInput } from "../domain/bill.types.js";
import type { UseCaseResult } from "../domain/bill.types.js";
import { fail } from "./use-case.js";

/** Phase 0: desk overrides limited to visit-registration ingest (see HIMS billing ADR follow-up). */
const DESK_OVERRIDE_SOURCE_MODULES = new Set(["registration"]);

export function hasDeskPricingOverrides(input: CaptureChargeInput): boolean {
  return (
    input.unit_price_override != null ||
    input.tax_percentage_override != null ||
    (input.line_discount_amount != null && Number(input.line_discount_amount) > 0)
  );
}

/**
 * Gate desk price overrides until `billing:bills:override-price` is wired through Cerbos.
 * Phase 0 dev: set `BILLING_ALLOW_DESK_PRICE_OVERRIDE=true` on billing-svc only.
 */
export function validateDeskPricingPolicy(
  input: CaptureChargeInput,
  allowDeskPriceOverride: boolean,
): UseCaseResult<void> | null {
  if (!hasDeskPricingOverrides(input)) return null;

  if (!allowDeskPriceOverride) {
    return fail(
      "FORBIDDEN",
      "desk price overrides require billing:bills:override-price (dev: BILLING_ALLOW_DESK_PRICE_OVERRIDE=true)",
    );
  }

  const source = input.source_module?.trim() ?? "";
  if (!DESK_OVERRIDE_SOURCE_MODULES.has(source)) {
    return fail("FORBIDDEN", `desk price overrides not allowed for source_module=${source}`);
  }

  if (input.unit_price_override != null && Number(input.unit_price_override) <= 0) {
    return fail("VALIDATION", "unit_price_override must be greater than zero");
  }

  return null;
}
