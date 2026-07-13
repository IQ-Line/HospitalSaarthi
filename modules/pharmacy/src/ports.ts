import type {
  DispenseLineItemRecord,
  DispenseRecord,
  DispenseFulfillmentStatus,
  OpdCompletedVisitSummary,
  OpdPrescriptionSnapshot,
  OpdQueueProjectionRow,
  OpdQueueProjectionUpsertInput,
  PharmacyQueueSourceKind,
  QueueProjectionRow,
  QueueProjectionUpsertInput,
  PharmacyDispenseStatus,
  SaveDispenseForVisitInput,
  SaveWalkInDispenseInput,
  WalkInPatientRecord,
  WalkInQueueSummary,
  ProcessDispenseReturnInput,
  DispenseReturnDetail,
  DispenseReturnSummary,
  DispenseReturnSearchHit,
  DispenseReturnEligibilityResponse,
} from "./domain/pharmacy.types.js";
import type { PharmacyQueueStatusFilter } from "./lib/pharmacy-queue-filter.js";

export interface OpdGatewayPort {
  getVisitPrescription(
    tenantId: string,
    visitId: string,
    bearerToken?: string,
  ): Promise<OpdPrescriptionSnapshot | null>;
}

export interface MasterDataGatewayPort {
  getMedicineById(
    tenantId: string,
    medicineId: string,
    bearerToken?: string,
  ): Promise<Record<string, unknown> | null>;
}

export type IssueDispenseStockCommand = {
  store_id: string;
  lines: Array<{ item_id: string; quantity: number }>;
  issue_date?: string;
};

export interface InventoryGatewayPort {
  issueDispenseStock(tenantId: string, command: IssueDispenseStockCommand): Promise<void>;
}

/** Resolves prescribing doctor display names from platform user ids. */
export interface UserLookupPort {
  resolveDoctorNames(tenantId: string, userIds: string[]): Promise<Map<string, string>>;
}

export type UpsertDispensePayload = SaveDispenseForVisitInput & {
  visit_id: string;
  dispense_status: DispenseFulfillmentStatus;
  created_by?: string | null;
};

export type UpsertDispenseResult = {
  record: DispenseRecord;
  lines: DispenseLineItemRecord[];
};

export interface DispenseRecordRepo {
  findById(tenantId: string, dispenseId: string): Promise<DispenseRecord | undefined>;
  findByVisit(tenantId: string, visitId: string): Promise<DispenseRecord | undefined>;
  listByVisitIds(tenantId: string, visitIds: string[]): Promise<DispenseRecord[]>;
  findLinesByRecordId(tenantId: string, recordId: string): Promise<DispenseLineItemRecord[]>;
  upsertForVisit(tenantId: string, payload: UpsertDispensePayload): Promise<UpsertDispenseResult>;
}

export type WalkInDispenseDetail = {
  record: DispenseRecord;
  patient: WalkInPatientRecord;
  lines: DispenseLineItemRecord[];
};

export type UpsertWalkInDispensePayload = SaveWalkInDispenseInput & {
  dispense_status: DispenseFulfillmentStatus;
  created_by?: string | null;
};

export interface WalkInDispenseRepo {
  findByRecordId(tenantId: string, recordId: string): Promise<WalkInDispenseDetail | undefined>;
  listForQueue(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      queued_from?: string;
      queued_to?: string;
      search?: string;
      status?: PharmacyQueueStatusFilter;
    },
  ): Promise<{ items: WalkInQueueSummary[]; total: number }>;
  create(tenantId: string, payload: UpsertWalkInDispensePayload): Promise<WalkInDispenseDetail>;
  upsert(
    tenantId: string,
    recordId: string,
    payload: UpsertWalkInDispensePayload,
  ): Promise<WalkInDispenseDetail>;
}

export interface QueueProjectionRepo {
  listForQueue(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      queued_from?: string;
      queued_to?: string;
      search?: string;
      status?: PharmacyQueueStatusFilter;
      source_kind?: PharmacyQueueSourceKind | "all";
    },
  ): Promise<{ items: QueueProjectionRow[]; total: number }>;

  upsert(tenantId: string, input: QueueProjectionUpsertInput): Promise<QueueProjectionRow>;

  updateDispenseStatus(
    tenantId: string,
    encounterId: string,
    dispenseStatus: PharmacyDispenseStatus,
    sourceKind?: PharmacyQueueSourceKind,
  ): Promise<void>;

  deleteByEncounterId(
    tenantId: string,
    encounterId: string,
    sourceKind?: PharmacyQueueSourceKind,
  ): Promise<void>;

  deleteByVisitId(tenantId: string, visitId: string): Promise<void>;

  findByEncounterId(
    tenantId: string,
    encounterId: string,
    sourceKind?: PharmacyQueueSourceKind,
  ): Promise<QueueProjectionRow | undefined>;

  findByVisitId(tenantId: string, visitId: string): Promise<QueueProjectionRow | undefined>;
}

export type SearchDispenseForReturnCriteria = {
  bill_number?: string;
  dispense_number?: string;
  prescription_number?: string;
  uhid?: string;
  patient_name?: string;
  mobile?: string;
  q?: string;
};

export type ProcessDispenseReturnPayload = ProcessDispenseReturnInput & {
  processed_by?: string | null;
  idempotency_key?: string | null;
};

export interface DispenseReturnRepo {
  searchEligibleDispenses(
    tenantId: string,
    criteria: SearchDispenseForReturnCriteria,
    page: number,
    limit: number,
  ): Promise<{ items: DispenseReturnSearchHit[]; total: number }>;

  getEligibilityContext(
    tenantId: string,
    dispenseId: string,
  ): Promise<
    | {
        record: import("./domain/pharmacy.types.js").DispenseRecord;
        lines: import("./domain/pharmacy.types.js").DispenseLineItemRecord[];
        projection: QueueProjectionRow | undefined;
      }
    | undefined
  >;

  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<DispenseReturnDetail | undefined>;

  processReturn(
    tenantId: string,
    payload: ProcessDispenseReturnPayload,
    preparedLines: Array<{
      dispense_line_item_id: string;
      return_qty: number;
      medicine_id: string | null;
      medicine_display_name: string;
      stock_batch_id: string | null;
      unit_amount: string;
      line_discount: string;
      tax_amount: string;
      return_amount: string;
    }>,
    nextDispenseStatus: string,
    updatedLineReturns: Array<{ lineId: string; quantity_returned: string }>,
  ): Promise<DispenseReturnDetail>;

  listReturns(
    tenantId: string,
    options: { page: number; limit: number; search?: string },
  ): Promise<{ items: DispenseReturnSummary[]; total: number }>;

  findReturnById(tenantId: string, returnId: string): Promise<DispenseReturnDetail | undefined>;
}

/** @deprecated Use `QueueProjectionRepo`. */
export type OpdQueueProjectionRepo = QueueProjectionRepo;

export type PharmacyRepos = {
  dispenseRecordRepo: DispenseRecordRepo;
  dispenseReturnRepo: DispenseReturnRepo;
  queueProjectionRepo: QueueProjectionRepo;
};

export type PharmacyGatewayPorts = {
  opdGateway: OpdGatewayPort;
  masterDataGateway: MasterDataGatewayPort;
  inventoryGateway: InventoryGatewayPort;
  userLookup: UserLookupPort;
};

export type PharmacyHandlerDeps = PharmacyGatewayPorts & PharmacyRepos;
