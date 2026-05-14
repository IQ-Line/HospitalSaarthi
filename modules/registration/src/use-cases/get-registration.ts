import type { RegistrationRepo } from "../ports.js";
import type { Registration } from "../domain/registration.types.js";
import { RegistrationNotFoundError } from "../errors.js";

interface Deps {
  registrationRepo: RegistrationRepo;
}

export async function getRegistration(
  deps: Deps,
  tenantId: string,
  registrationId: string,
): Promise<Registration> {
  const row = await deps.registrationRepo.findById(tenantId, registrationId);
  if (!row) throw new RegistrationNotFoundError(registrationId);
  return row;
}
