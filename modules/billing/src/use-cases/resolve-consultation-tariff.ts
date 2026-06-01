import type { TariffMasterRow } from "../domain/tariff-master.types.js";
import type { UseCaseResult } from "../domain/bill.types.js";
import { fail, ok } from "../lib/use-case.js";
import type { ConsultationTariffDeps } from "../ports.js";

export type ResolveConsultationTariffInput = {
  provider_id: string;
  department_id: string;
  consultation_type_id: string;
};

export async function resolveConsultationTariff(
  deps: Pick<ConsultationTariffDeps, "tariffRepo">,
  tenantId: string,
  input: ResolveConsultationTariffInput,
): Promise<UseCaseResult<TariffMasterRow>> {
  if (!input.provider_id?.trim()) {
    return fail("VALIDATION", "provider_id is required");
  }
  if (!input.department_id?.trim()) {
    return fail("VALIDATION", "department_id is required");
  }
  if (!input.consultation_type_id?.trim()) {
    return fail("VALIDATION", "consultation_type_id is required");
  }

  const tariff = await deps.tariffRepo.resolveConsultationTariff(
    tenantId,
    input.provider_id,
    input.department_id,
    input.consultation_type_id,
  );
  if (!tariff) {
    return fail(
      "NOT_FOUND",
      "consultation_tariff_not_found: no active tariff for provider, department, and consultation type",
    );
  }
  return ok(tariff);
}
