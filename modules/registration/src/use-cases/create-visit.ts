import type { EventBus } from "@hims/ts-sdk-events";
import type { OpdHttpPort, VisitRepo } from "../ports.js";
import type { CreateVisitInput, InsertVisitResult } from "../domain/visit.types.js";
import type { VisitStatus } from "../lib/visit-helpers.js";
import { visitStatusFromIntakeCompletion } from "../lib/visit-helpers.js";
import { publishVisitCreated } from "../events/publish-visit-created.js";

export type CreateVisitContext = {
  idempotencyKey: string;
  actorId: string;
  initialStatus?: VisitStatus;
  bearerToken?: string;
};

export async function createVisit(
  deps: {
    visitRepo: VisitRepo;
    allocateOpVisitId: (tenantId: string) => Promise<string>;
    eventBus: EventBus;
    opdGateway?: OpdHttpPort;
  },
  tenantId: string,
  input: CreateVisitInput,
  ctx: CreateVisitContext,
): Promise<InsertVisitResult> {
  const initialStatus =
    ctx.initialStatus ?? visitStatusFromIntakeCompletion(input.intake_completion);

  const formattedVisitId = await deps.allocateOpVisitId(tenantId);

  const result = await deps.visitRepo.insert(
    tenantId,
    input,
    formattedVisitId,
    ctx.idempotencyKey,
    ctx.actorId,
    initialStatus,
  );

  if (result.created) {
    await publishVisitCreated(deps, result.record, ctx.actorId);
    if (deps.opdGateway) {
      await deps.opdGateway.ensureEncounter(
        tenantId,
        result.record.id,
        result.record.patient_id,
        ctx.bearerToken,
        result.record.doctor_id,
      );
    }
  }

  return result;
}
