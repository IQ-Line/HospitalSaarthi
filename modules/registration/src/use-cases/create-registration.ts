import type { EventBus } from "@hims/ts-sdk-events";
import type { RegistrationRepo } from "../ports.js";
import type {
  CreateRegistrationInput,
  InsertRegistrationResult,
} from "../domain/registration.types.js";
import type { RegistrationStatus } from "../lib/registration-helpers.js";
import { registrationStatusFromIntakeCompletion } from "../lib/registration-helpers.js";
import { publishRegistrationCreated } from "../events/publish-registration-created.js";

export type CreateRegistrationContext = {
  idempotencyKey: string;
  actorId: string;
  initialStatus?: RegistrationStatus;
};

export async function createRegistration(
  deps: { registrationRepo: RegistrationRepo; eventBus: EventBus },
  tenantId: string,
  input: CreateRegistrationInput,
  ctx: CreateRegistrationContext,
): Promise<InsertRegistrationResult> {
  const initialStatus =
    ctx.initialStatus ??
    registrationStatusFromIntakeCompletion(input.intake_completion);

  const result = await deps.registrationRepo.insert(
    tenantId,
    input,
    ctx.idempotencyKey,
    ctx.actorId,
    initialStatus,
  );

  if (result.created) {
    await publishRegistrationCreated(
      { eventBus: deps.eventBus },
      result.record,
      ctx.actorId,
    );
  }

  return result;
}
