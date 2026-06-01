import type { TariffMasterRepo } from "../ports.js";
import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import {
  isConsultationTariffCategory,
  isRegistrationTariffCategory,
  normalizeDepartmentLabel,
} from "../lib/tariff-category.js";
import { formatMoney, parseEffectiveWindow, validateMoney } from "../lib/tariff-api.js";
import { fail, ok, type UseCaseResult } from "../lib/use-case.js";

export type CreateTariffServiceInput = {
  service_code: string;
  service_name: string;
  base_price: string | number;
  tax_percentage?: string | number;
  description?: string | null;
  provider_id?: string | null;
  department_id?: string | null;
  department?: string | null;
  category?: string | null;
  sub_category?: string | null;
  tax_type?: string | null;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string | null;
};

type Deps = { tariffRepo: TariffMasterRepo };

function validateBody(body: CreateTariffServiceInput): string | null {
  if (!body.service_code.trim()) return "service_code is required";
  if (!body.service_name.trim()) return "service_name is required";
  const moneyError =
    validateMoney(body.base_price, "base_price", 0) ??
    validateMoney(body.tax_percentage, "tax_percentage", 0, 100);
  return moneyError;
}

export async function validateTariffCreateUniqueness(
  repo: TariffMasterRepo,
  tenantId: string,
  body: CreateTariffServiceInput,
): Promise<string | null> {
  const isActive = body.is_active ?? true;
  if (!isActive) return null;

  const providerId = body.provider_id?.trim() || null;
  const category = body.category ?? null;

  if (isRegistrationTariffCategory(category) && !providerId) {
    const existing = await repo.findActiveRegistrationFee(tenantId);
    if (existing) {
      return "registration_fee_already_exists: only one active registration fee is allowed per tenant";
    }
    return null;
  }

  if (providerId && isConsultationTariffCategory(category)) {
    const departmentId = body.department_id?.trim() || null;
    const departmentLabel = normalizeDepartmentLabel(body.department);
    const duplicate = await repo.findActiveProviderDepartmentTariff(tenantId, {
      provider_id: providerId,
      department_id: departmentId,
      department: departmentLabel || null,
    });
    if (duplicate) {
      return "provider_department_tariff_already_exists: this doctor already has a tariff in this department";
    }
  }

  return null;
}

export type CreateTariffServiceDeps = Deps & {
  insert: (tenantId: string, body: CreateTariffServiceInput, effective: { from: Date; to: Date | null }) => Promise<TariffMasterRow>;
};

export async function createTariffService(
  deps: CreateTariffServiceDeps,
  tenantId: string,
  body: CreateTariffServiceInput,
): Promise<UseCaseResult<TariffMasterRow>> {
  const validationError = validateBody(body);
  if (validationError) return fail("VALIDATION", validationError);

  const effective = parseEffectiveWindow(body.effective_from, body.effective_to);
  if (typeof effective === "string") return fail("VALIDATION", effective);

  const uniquenessError = await validateTariffCreateUniqueness(deps.tariffRepo, tenantId, body);
  if (uniquenessError) return fail("CONFLICT", uniquenessError);

  try {
    const row = await deps.insert(tenantId, body, effective);
    return ok(row);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      return fail(
        "CONFLICT",
        "tariff_conflict: duplicate registration fee or doctor/department tariff",
      );
    }
    throw err;
  }
}

export function toInsertValues(
  tenantId: string,
  body: CreateTariffServiceInput,
  effective: { from: Date; to: Date | null },
) {
  return {
    iq_tenant_id: tenantId,
    service_code: body.service_code.trim(),
    service_name: body.service_name.trim(),
    description: body.description ?? null,
    provider_id: body.provider_id ?? null,
    department_id: body.department_id ?? null,
    department: body.department ?? null,
    category: body.category ?? null,
    sub_category: body.sub_category ?? null,
    tax_type: body.tax_type ?? null,
    is_active: body.is_active ?? true,
    base_price: formatMoney(Number(body.base_price)),
    tax_percentage: formatMoney(Number(body.tax_percentage ?? 0)),
    effective_from: effective.from,
    effective_to: effective.to,
  };
}
