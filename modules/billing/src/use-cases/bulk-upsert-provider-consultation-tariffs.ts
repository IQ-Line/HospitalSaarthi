import type {
  BulkUpsertProviderConsultationTariffsInput,
  ProviderConsultationTariffView,
} from "../domain/consultation-tariff.types.js";
import type { UseCaseResult } from "../domain/bill.types.js";
import {
  buildConsultationServiceCode,
  buildConsultationServiceName,
} from "../lib/consultation-service-code.js";
import { formatMoney, validateMoney } from "../lib/tariff-api.js";
import { fail, ok } from "../lib/use-case.js";
import type { ConsultationTariffDeps } from "../ports.js";

function toView(row: {
  id: string;
  provider_id: string | null;
  department_id: string | null;
  consultation_type_id: string | null;
  service_code: string;
  service_name: string;
  department: string | null;
  base_price: string;
  tax_percentage: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
}): ProviderConsultationTariffView {
  return {
    id: row.id,
    provider_id: row.provider_id,
    department_id: row.department_id,
    consultation_type_id: row.consultation_type_id,
    service_code: row.service_code,
    service_name: row.service_name,
    department: row.department,
    base_price: row.base_price,
    tax_percentage: row.tax_percentage,
    is_active: row.is_active,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
  };
}

function duplicateItemKey(
  item: BulkUpsertProviderConsultationTariffsInput["items"][number],
): string {
  return `${item.department_id}:${item.consultation_type_id}`;
}

export async function bulkUpsertProviderConsultationTariffs(
  deps: ConsultationTariffDeps,
  tenantId: string,
  input: BulkUpsertProviderConsultationTariffsInput,
): Promise<UseCaseResult<ProviderConsultationTariffView[]>> {
  if (!input.provider_id?.trim()) {
    return fail("VALIDATION", "provider_id is required");
  }
  if (!input.items?.length) {
    return fail("VALIDATION", "items must contain at least one tariff");
  }

  const seen = new Set<string>();
  for (const item of input.items) {
    if (!item.department_id?.trim()) {
      return fail("VALIDATION", "department_id is required on each item");
    }
    if (!item.consultation_type_id?.trim()) {
      return fail("VALIDATION", "consultation_type_id is required on each item");
    }
    const key = duplicateItemKey(item);
    if (seen.has(key)) {
      return fail(
        "VALIDATION",
        "duplicate provider/department/consultation_type rows in request",
      );
    }
    seen.add(key);

    const moneyError =
      validateMoney(item.base_price, "base_price", 0) ??
      validateMoney(item.tax_percentage, "tax_percentage", 0, 100);
    if (moneyError) return fail("VALIDATION", moneyError);
  }

  const providerExists = await deps.referenceValidator.providerExists(
    tenantId,
    input.provider_id,
  );
  if (!providerExists) {
    return fail("NOT_FOUND", "provider_not_found");
  }

  await deps.consultationTypesRepo.ensureDefaultTypes(tenantId);

  const typeById = new Map<
    string,
    { code: string; display_name: string }
  >();
  const deptById = new Map<string, { code: string; display_name: string }>();

  for (const item of input.items) {
    if (!typeById.has(item.consultation_type_id)) {
      const type = await deps.consultationTypesRepo.findById(
        tenantId,
        item.consultation_type_id,
      );
      if (!type) {
        return fail("NOT_FOUND", `consultation_type_not_found: ${item.consultation_type_id}`);
      }
      typeById.set(item.consultation_type_id, type);
    }

    if (!deptById.has(item.department_id)) {
      const dept = await deps.referenceValidator.resolveDepartment(
        tenantId,
        item.department_id,
      );
      if (!dept) {
        return fail("NOT_FOUND", `department_not_found: ${item.department_id}`);
      }
      deptById.set(item.department_id, dept);
    }
  }

  const effectiveFrom = new Date();
  for (const item of input.items) {
    const existing = await deps.tariffRepo.resolveConsultationTariff(
      tenantId,
      input.provider_id,
      item.department_id,
      item.consultation_type_id,
    );
    const overlaps = await deps.tariffRepo.hasOverlappingConsultationTariff(
      tenantId,
      input.provider_id,
      item.department_id,
      item.consultation_type_id,
      effectiveFrom,
      null,
      existing?.id,
    );
    if (overlaps) {
      return fail(
        "CONFLICT",
        "effective_date_overlap: overlapping tariff for provider, department, and consultation type",
      );
    }
  }

  try {
    const rows = await deps.tariffRepo.bulkUpsertProviderConsultationTariffs(
      tenantId,
      input,
      (item) => {
        const type = typeById.get(item.consultation_type_id)!;
        const dept = deptById.get(item.department_id)!;
        return {
          provider_id: input.provider_id,
          department_id: item.department_id,
          consultation_type_id: item.consultation_type_id,
          base_price: formatMoney(Number(item.base_price)),
          tax_percentage: formatMoney(Number(item.tax_percentage ?? 0)),
          service_code: buildConsultationServiceCode(type.code, dept.code),
          service_name: buildConsultationServiceName(type.display_name, dept.display_name),
          department_label: dept.display_name,
        };
      },
    );

    return ok(rows.map(toView));
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      return fail(
        "CONFLICT",
        "provider_department_tariff_already_exists: this doctor already has a tariff in this department",
      );
    }
    throw err;
  }
}
