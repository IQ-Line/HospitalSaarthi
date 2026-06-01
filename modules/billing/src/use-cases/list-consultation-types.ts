import type { ConsultationTypeRow } from "../domain/consultation-types.types.js";
import type { UseCaseResult } from "../domain/bill.types.js";
import { ok } from "../lib/use-case.js";
import type { ConsultationTariffDeps } from "../ports.js";

export async function listConsultationTypes(
  deps: Pick<ConsultationTariffDeps, "consultationTypesRepo">,
  tenantId: string,
): Promise<UseCaseResult<ConsultationTypeRow[]>> {
  await deps.consultationTypesRepo.ensureDefaultTypes(tenantId);
  const rows = await deps.consultationTypesRepo.listActive(tenantId);
  const now = new Date().toISOString();
  return ok(
    rows.map((row) => ({
      id: row.id,
      iq_tenant_id: tenantId,
      code: row.code,
      display_name: row.display_name,
      is_active: true,
      created_at: now,
      updated_at: now,
    })),
  );
}
