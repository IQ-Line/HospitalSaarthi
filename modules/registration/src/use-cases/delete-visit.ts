import type { VisitRepo } from "../ports.js";

export async function deleteVisit(
  deps: { visitRepo: VisitRepo },
  tenantId: string,
  visitId: string,
): Promise<boolean> {
  return deps.visitRepo.delete(tenantId, visitId);
}
