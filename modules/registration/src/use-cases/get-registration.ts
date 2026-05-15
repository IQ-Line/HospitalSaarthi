import type { RegistrationRepo } from "../ports.js";
import type { RegistrationRecord } from "../domain/registration.types.js";

export async function getRegistration(
  deps: { registrationRepo: RegistrationRepo },
  tenantId: string,
  registrationId: string,
): Promise<RegistrationRecord | undefined> {
  return deps.registrationRepo.findById(tenantId, registrationId);
}
