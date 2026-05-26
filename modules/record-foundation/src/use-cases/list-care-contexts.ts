import type { CareContextRepo } from "../ports.js";
import type {
  CareContext,
  CareContextFilters,
} from "../domain/care-context.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export async function listCareContexts(
  deps: Deps,
  tenantId: string,
  filters: CareContextFilters,
): Promise<{ data: CareContext[]; total: number }> {
  return deps.careContextRepo.findAll(tenantId, filters);
}
