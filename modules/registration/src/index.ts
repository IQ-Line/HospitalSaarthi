export { createRouter } from "./router.js";
export type { RegistrationRouterOptions } from "./router.js";

export {
  registerRegistrationsHandler,
  type RegistrationsHandlerDeps,
} from "./rest-handlers/registrations.handler.js";

export type {
  RegistrationRecord,
  CreateRegistrationInput,
  NewPatientIntakeInput,
  RegistrationListPage,
  RegistrationListItem,
} from "./domain/registration.types.js";

export type { RegistrationRepo, EmpiHttpPort } from "./ports.js";

export { DrizzleRegistrationRepo } from "./data-access/registration.repo.js";
export { HttpEmpiGateway } from "./lib/http-empi-gateway.js";

export { registrationSchema, registrations } from "./schema/tables.js";
export { applyRegistrationSchemaMigration } from "./schema/apply-migration.js";
