export { createRouter } from "./router.js";
export type { RegistrationRouterOptions } from "./router.js";

export type {
  Registration,
  CreateRegistrationData,
  RegistrationStatus,
} from "./domain/registration.types.js";

export type { EmpiPatientsPort, RegistrationRepo } from "./ports.js";

export { DrizzleRegistrationRepo } from "./data-access/registration.repo.js";

export { registrationSchema, registrations } from "./schema/tables.js";

export { RegistrationNotFoundError, EmpiPatientGatewayNotConfiguredError } from "./errors.js";

export { createRegistration } from "./use-cases/create-registration.js";
export { getRegistration } from "./use-cases/get-registration.js";
export { createIntakeForNewPatient } from "./use-cases/create-intake-for-new-patient.js";
