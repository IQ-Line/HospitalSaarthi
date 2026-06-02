import type { VisitRepo } from "../ports.js";
import type { UpdateVisitInput, VisitRecord } from "../domain/visit.types.js";

export async function updateVisit(
  deps: { visitRepo: VisitRepo },
  tenantId: string,
  visitId: string,
  input: UpdateVisitInput,
  actorId: string,
): Promise<VisitRecord | undefined> {
  return deps.visitRepo.update(tenantId, visitId, input, actorId);
}
