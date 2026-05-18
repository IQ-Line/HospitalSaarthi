import type { TariffMasterRepo, TariffMasterUpdatePatch } from "../ports.js";
import type {
  TariffMasterRow,
  UpdateTariffServiceInput,
  UpdateTariffServiceResult,
} from "../domain/tariff-master.types.js";
import {
  hasPriceChange,
  parseDate,
  validateEffectiveRange,
  validateMoney,
} from "../lib/tariff-api.js";

const SCALAR_KEYS = [
  "service_name",
  "description",
  "department",
  "category",
  "sub_category",
  "tax_type",
  "base_price",
  "tax_percentage",
  "is_active",
] as const satisfies readonly (keyof UpdateTariffServiceInput)[];

type Deps = { tariffRepo: TariffMasterRepo };

function buildPatch(
  input: UpdateTariffServiceInput,
  existing: TariffMasterRow,
  updatedBy?: string | null,
): UpdateTariffServiceResult | TariffMasterUpdatePatch {
  const patch: TariffMasterUpdatePatch = { updated_by: updatedBy };
  for (const k of SCALAR_KEYS) {
    if (input[k] !== undefined) patch[k] = input[k] as never;
  }

  if (input.effective_from !== undefined) {
    const d = parseDate(input.effective_from);
    if (!d) return { ok: false, code: "VALIDATION", message: "effective_from is invalid" };
    patch.effective_from = d;
  } else if (hasPriceChange(input)) {
    patch.effective_from = new Date();
  }

  if (input.effective_to !== undefined) {
    if (input.effective_to === null) patch.effective_to = null;
    else {
      const d = parseDate(input.effective_to);
      if (!d) return { ok: false, code: "VALIDATION", message: "effective_to is invalid" };
      patch.effective_to = d;
    }
  }

  const from = patch.effective_from instanceof Date
    ? patch.effective_from
    : patch.effective_from
      ? new Date(patch.effective_from)
      : new Date(existing.effective_from);
  const to =
    patch.effective_to !== undefined
      ? patch.effective_to
      : existing.effective_to
        ? new Date(existing.effective_to)
        : null;

  const rangeError = validateEffectiveRange(from, to);
  if (rangeError) return { ok: false, code: "VALIDATION", message: rangeError };

  if (!SCALAR_KEYS.some((k) => input[k] !== undefined) && patch.effective_from === undefined && patch.effective_to === undefined) {
    return { ok: false, code: "VALIDATION", message: "At least one field is required" };
  }

  return patch;
}

export async function updateTariffService(
  deps: Deps,
  tenantId: string,
  serviceId: string,
  input: UpdateTariffServiceInput,
  updatedBy?: string | null,
): Promise<UpdateTariffServiceResult> {
  if (!Object.keys(input).length) {
    return { ok: false, code: "VALIDATION", message: "At least one field is required" };
  }

  const moneyError =
    validateMoney(input.base_price, "base_price", 0) ??
    validateMoney(input.tax_percentage, "tax_percentage", 0, 100);
  if (moneyError) return { ok: false, code: "VALIDATION", message: moneyError };

  const existing = await deps.tariffRepo.findById(tenantId, serviceId);
  if (!existing) return { ok: false, code: "NOT_FOUND", message: "Service not found" };

  const built = buildPatch(input, existing, updatedBy);
  if ("ok" in built) return built;

  const updated = await deps.tariffRepo.update(tenantId, serviceId, built);
  return updated
    ? { ok: true, data: updated }
    : { ok: false, code: "NOT_FOUND", message: "Service not found" };
}
