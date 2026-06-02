import type { VisitRepo } from "../ports.js";
import type { VisitRecord } from "../domain/visit.types.js";
import type { VisitStatus } from "../lib/visit-helpers.js";
import { VISIT_STATUS_COMPLETED } from "../lib/visit-helpers.js";

export async function updateVisitStatus(
  deps: { visitRepo: VisitRepo },
  tenantId: string,
  visitId: string,
  toStatus: VisitStatus,
  actorId: string,
): Promise<VisitRecord | undefined> {
  return deps.visitRepo.updateStatus(tenantId, visitId, toStatus, actorId);
}

export async function completeVisitIntake(
  deps: { visitRepo: VisitRepo },
  tenantId: string,
  visitId: string,
  actorId: string,
): Promise<VisitRecord | undefined> {
  return updateVisitStatus(deps, tenantId, visitId, VISIT_STATUS_COMPLETED, actorId);
}
