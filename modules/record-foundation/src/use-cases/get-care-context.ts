import type { CareContextRepo, CareContextRow } from "../ports.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export async function getCareContext(
  deps: Deps,
  tenantId: string,
  id: string,
): Promise<CareContextRow | null> {
  return deps.careContextRepo.findById(tenantId, id);
}
