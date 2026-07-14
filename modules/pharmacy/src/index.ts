export { createRouter, HttpOpdGateway, HttpMasterDataGateway, HttpInventoryGateway } from "./router.js";
export type { PharmacyRouterOptions } from "./router.js";

export { PHARMACY_MODULE_KEY } from "./domain/pharmacy.types.js";
export { PHARMACY_SCHEMA_NAME, dispense, dispenseRecords, dispenseLineItems, queueProjection } from "./schema/tables.js";
export { applyPharmacySchemaMigration } from "./schema/apply-migration.js";

export { createPharmacyAuthzTargetResolver } from "./authz/pharmacy-authz-target-resolver.js";
export { createDispenseRecordRepo, DrizzleDispenseRecordRepo } from "./data-access/dispense-record.repo.js";
export {
  createQueueProjectionRepo,
  DrizzleQueueProjectionRepo,
  createOpdQueueProjectionRepo,
  DrizzleOpdQueueProjectionRepo,
} from "./data-access/queue-projection.repo.js";
export { registerPharmacyHandlers } from "./rest-handlers/pharmacy.handlers.js";

export type {
  DispenseRecord,
  DispenseLineItemRecord,
  OpdCompletedVisitSummary,
  OpdPrescriptionSnapshot,
  OpdPrescriptionMedicineLine,
  PharmacyQueueItem,
  SaveDispenseLineInput,
  SaveDispenseForVisitInput,
  DispenseForVisitResponse,
} from "./domain/pharmacy.types.js";

export type {
  OpdGatewayPort,
  MasterDataGatewayPort,
  InventoryGatewayPort,
  UserLookupPort,
  DispenseRecordRepo,
  DispenseReturnRepo,
  QueueProjectionRepo,
  OpdQueueProjectionRepo,
  PharmacyGatewayPorts,
  PharmacyRepos,
  PharmacyHandlerDeps,
} from "./ports.js";

export { listPharmacyQueue } from "./use-cases/list-pharmacy-queue.js";
export type { ListPharmacyQueueInput, ListPharmacyQueueResult } from "./use-cases/list-pharmacy-queue.js";
export {
  applyOpdQueueProjectionUpsert,
  mapOpdQueueProjectionRowToWire,
  removeOpdQueueProjection,
  updateOpdQueueProjectionDispenseStatus,
} from "./use-cases/upsert-opd-queue-projection.js";
export type { OpdQueueProjectionUpsertRequest } from "./use-cases/upsert-opd-queue-projection.js";
export { getDispenseForVisit, DispenseVisitNotFoundError } from "./use-cases/get-dispense-for-visit.js";
export type { GetDispenseForVisitInput } from "./use-cases/get-dispense-for-visit.js";
export {
  saveDispenseForVisit,
  DispenseAlreadyIssuedError,
  DispensePatientMismatchError,
  DispensePrescriptionMismatchError,
  DispenseValidationError,
  DispenseInsufficientStockError,
} from "./use-cases/save-dispense-for-visit.js";
export type { SaveDispenseForVisitCommand } from "./use-cases/save-dispense-for-visit.js";
export { issueManualDispenseStock } from "./use-cases/issue-manual-dispense-stock.js";
export type {
  IssueManualDispenseStockInput,
  ManualDispenseStockLine,
} from "./use-cases/issue-manual-dispense-stock.js";
export {
  createDispenseReturnRepo,
  DrizzleDispenseReturnRepo,
} from "./data-access/dispense-return.repo.js";
