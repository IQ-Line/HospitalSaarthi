import type { CareContextRepo, CareContextRow } from "../ports.js";
import type { CareContextFilters } from "../domain/care-context.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export async function listCareContexts(
  deps: Deps,
  tenantId: string,
  filters?: CareContextFilters,
): Promise<{ data: CareContextRow[]; total: number }> {
  return deps.careContextRepo.findAll(tenantId, filters);
}
