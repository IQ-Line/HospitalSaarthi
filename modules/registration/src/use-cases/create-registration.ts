import type { RegistrationRepo } from "../ports.js";
import type {
  CreateRegistrationInput,
  RegistrationRecord,
} from "../domain/registration.types.js";

export async function createRegistration(
  deps: { registrationRepo: RegistrationRepo },
  tenantId: string,
  input: CreateRegistrationInput,
): Promise<RegistrationRecord> {
  return deps.registrationRepo.insert(tenantId, input);
}
