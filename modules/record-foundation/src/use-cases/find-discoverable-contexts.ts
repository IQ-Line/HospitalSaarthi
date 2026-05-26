import type { CareContextRepo } from "../ports.js";
import type { CareContext } from "../domain/care-context.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export async function findDiscoverableContexts(
  deps: Deps,
  tenantId: string,
  patientId: string,
): Promise<CareContext[]> {
  const { data } = await deps.careContextRepo.findAll(tenantId, {
    patient_id: patientId,
    abha_linkage_status: "linked",
  });

  return data.filter((ctx) => ctx.consent_disclosable);
}
