export {
  registerRegistrationsHandler,
  type RegistrationsHandlerDeps,
} from "./rest-handlers/registrations.handler.js";

export {
  registerVisitsHandler,
  type VisitsHandlerDeps,
} from "./rest-handlers/visits.handler.js";

export type {
  RegistrationRecord,
  CreateRegistrationInput,
  NewPatientIntakeInput,
  ExistingPatientVisitInput,
  RegistrationListPage,
  RegistrationListItem,
  InsertRegistrationResult,
  RegistrationWithVisitRecord,
} from "./domain/registration.types.js";

export type {
  VisitRecord,
  CreateVisitInput,
  UpdateVisitInput,
  VisitListPage,
  InsertVisitResult,
} from "./domain/visit.types.js";

export {
  REGISTRATION_EVENT_REGISTRATION_CREATED,
  type IntakeCompletion,
  readIdempotencyKey,
  resolveActorId,
} from "./lib/registration-helpers.js";

export {
  VISIT_STATUS_PENDING,
  VISIT_STATUS_IN_PROGRESS,
  VISIT_STATUS_COMPLETED,
  VISIT_STATUS_CANCELLED,
  type VisitStatus,
  visitStatusFromIntakeCompletion,
} from "./lib/visit-helpers.js";

export { VISIT_EVENT_VISIT_CREATED } from "./events/publish-visit-created.js";

export { publishRegistrationCreated } from "./events/publish-registration-created.js";
export { publishVisitCreated } from "./events/publish-visit-created.js";

export type {
  RegistrationRepo,
  VisitRepo,
  EmpiHttpPort,
  BillingReadPort,
  BillingWritePort,
  BillingBillSummary,
  ApiKeyValidatorPort,
  ApiKeyValidationResult,
} from "./ports.js";

export { apiKeyAuthPlugin, type ApiKeyAuthPluginOptions } from "./http/api-key-auth-plugin.js";

export { DrizzleRegistrationRepo } from "./data-access/registration.repo.js";
export { DrizzleVisitRepo } from "./data-access/visit.repo.js";
export { HttpConfiguratorGateway } from "./lib/http-configurator-gateway.js";
export { HttpEmpiGateway } from "./lib/http-empi-gateway.js";
export { HttpBillingGateway } from "./lib/http-billing-gateway.js";
export { HttpBillingWriteGateway } from "./lib/http-billing-write-gateway.js";
export { HttpPicklistGateway } from "./lib/http-picklist-gateway.js";
export { registerDocumentsHandler, type DocumentsHandlerDeps } from "./rest-handlers/documents.handler.js";

export { registrationSchema, registrations, visits } from "./schema/tables.js";
export { applyRegistrationSchemaMigration } from "./schema/apply-migration.js";

export { createRegistrationAuthzTargetResolver } from "./authz/registration-authz-target-resolver.js";
export { registerInternalHandlers } from "./rest-handlers/internal.handler.js";
