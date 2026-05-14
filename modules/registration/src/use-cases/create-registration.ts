import type { RegistrationRepo } from "../ports.js";
import type { CreateRegistrationData, Registration } from "../domain/registration.types.js";

interface Deps {
  registrationRepo: RegistrationRepo;
}

export async function createRegistration(
  deps: Deps,
  tenantId: string,
  data: CreateRegistrationData,
): Promise<Registration> {
  return deps.registrationRepo.create(tenantId, data);
}
