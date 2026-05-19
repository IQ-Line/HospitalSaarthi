import type { RegistrationRepo } from "../ports.js";
import type { RegistrationRecord } from "../domain/registration.types.js";
import { REGISTRATION_STATUS_COMPLETED } from "../lib/registration-helpers.js";

/** Marks a registration completed after the full visit-intake chain (registration + appointment + billing). */
export async function completeRegistrationIntake(
  deps: { registrationRepo: RegistrationRepo },
  tenantId: string,
  registrationId: string,
  actorId: string,
): Promise<RegistrationRecord | undefined> {
  return deps.registrationRepo.updateStatus(
    tenantId,
    registrationId,
    REGISTRATION_STATUS_COMPLETED,
    actorId,
  );
}
