import type { CareContextRepo } from "../ports.js";
import type { CareContext } from "../domain/care-context.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export async function getCareContext(
  deps: Deps,
  tenantId: string,
  id: string,
): Promise<CareContext | null> {
  return deps.careContextRepo.findById(tenantId, id);
}
