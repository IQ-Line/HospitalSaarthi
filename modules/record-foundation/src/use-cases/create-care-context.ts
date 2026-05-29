import type { CareContextRepo, CareContextRow } from "../ports.js";
import type { CreateCareContextData } from "../domain/care-context.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export async function createCareContext(
  deps: Deps,
  tenantId: string,
  data: CreateCareContextData,
): Promise<CareContextRow> {
  return deps.careContextRepo.insert({ ...data, iqTenantId: tenantId });
}
