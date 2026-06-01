import type { EventBus } from "@hims/ts-sdk-events";
import type { VisitRepo } from "../ports.js";
import type { CreateVisitInput, InsertVisitResult } from "../domain/visit.types.js";
import type { VisitStatus } from "../lib/visit-helpers.js";
import { visitStatusFromIntakeCompletion } from "../lib/visit-helpers.js";
import { publishVisitCreated } from "../events/publish-visit-created.js";

export type CreateVisitContext = {
  idempotencyKey: string;
  actorId: string;
  initialStatus?: VisitStatus;
};

export async function createVisit(
  deps: { visitRepo: VisitRepo; eventBus: EventBus },
  tenantId: string,
  input: CreateVisitInput,
  ctx: CreateVisitContext,
): Promise<InsertVisitResult> {
  const initialStatus =
    ctx.initialStatus ?? visitStatusFromIntakeCompletion(input.intake_completion);

  const result = await deps.visitRepo.insert(
    tenantId,
    input,
    ctx.idempotencyKey,
    ctx.actorId,
    initialStatus,
  );

  if (result.created) {
    await publishVisitCreated(deps, result.record, ctx.actorId);
  }

  return result;
}
