import type { EventBus } from "@hims/ts-sdk-events";
import type { RegistrationRepo } from "../ports.js";
import type {
  CreateRegistrationInput,
  InsertRegistrationResult,
} from "../domain/registration.types.js";
import { publishRegistrationCreated } from "../events/publish-registration-created.js";

export type CreateRegistrationContext = {
  idempotencyKey: string;
  actorId: string;
};

export async function createRegistration(
  deps: { registrationRepo: RegistrationRepo; eventBus: EventBus },
  tenantId: string,
  input: CreateRegistrationInput,
  ctx: CreateRegistrationContext,
): Promise<InsertRegistrationResult> {
  const result = await deps.registrationRepo.insert(
    tenantId,
    input,
    ctx.idempotencyKey,
    ctx.actorId,
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
