import type {
  ListProviderConsultationTariffsQuery,
  ProviderConsultationTariffView,
} from "../domain/consultation-tariff.types.js";
import type { UseCaseResult } from "../domain/bill.types.js";
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

export async function listProviderConsultationTariffs(
  deps: Pick<ConsultationTariffDeps, "tariffRepo">,
  tenantId: string,
  query: ListProviderConsultationTariffsQuery,
): Promise<UseCaseResult<ProviderConsultationTariffView[]>> {
  if (!query.provider_id?.trim() && !query.department_id?.trim()) {
    return fail("VALIDATION", "provider_id or department_id is required");
  }

  const rows = await deps.tariffRepo.listProviderConsultationTariffs(tenantId, query);
  return ok(rows.map(toView));
}
