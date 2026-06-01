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
  InsertRegistrationResult,
} from "./domain/registration.types.js";

export {
  REGISTRATION_EVENT_REGISTRATION_CREATED,
  REGISTRATION_STATUS_PENDING,
  REGISTRATION_STATUS_IN_PROGRESS,
  REGISTRATION_STATUS_COMPLETED,
  type IntakeCompletion,
  type RegistrationEventType,
  type RegistrationStatus,
  registrationStatusFromIntakeCompletion,
  readIdempotencyKey,
  resolveActorId,
} from "./lib/registration-helpers.js";
export { publishRegistrationCreated } from "./events/publish-registration-created.js";

export type { RegistrationRepo, EmpiHttpPort } from "./ports.js";

export { DrizzleRegistrationRepo } from "./data-access/registration.repo.js";
export { HttpEmpiGateway } from "./lib/http-empi-gateway.js";
export { HttpBillingGateway } from "./lib/http-billing-gateway.js";
export { registerDocumentsHandler, type DocumentsHandlerDeps } from "./rest-handlers/documents.handler.js";
export type { BillingReadPort, BillingBillSummary } from "./ports.js";

export { registrationSchema, registrations } from "./schema/tables.js";
export { applyRegistrationSchemaMigration } from "./schema/apply-migration.js";

export { createRegistrationAuthzTargetResolver } from "./authz/registration-authz-target-resolver.js";
