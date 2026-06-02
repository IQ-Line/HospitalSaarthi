import type { VisitRepo } from "../ports.js";
import type { VisitRecord } from "../domain/visit.types.js";

export async function getVisit(
  deps: { visitRepo: VisitRepo },
  tenantId: string,
  visitId: string,
): Promise<VisitRecord | undefined> {
  return deps.visitRepo.findById(tenantId, visitId);
}
