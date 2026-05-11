import type { Patient } from "../domain/patient.types.js";
import type { DuplicateRegistrationResponse } from "../domain/registration-dedup.js";

export type RegisterPatientResult = Patient | DuplicateRegistrationResponse;

export function isDuplicateRegistrationResult(
  r: RegisterPatientResult,
): r is DuplicateRegistrationResponse {
  return (
    typeof r === "object" &&
    r !== null &&
    "potential_duplicate" in r &&
    r.potential_duplicate === true
  );
}
