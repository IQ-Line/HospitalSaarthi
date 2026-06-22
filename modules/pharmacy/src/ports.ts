import type {
  DispenseLineItemRecord,
  DispenseRecord,
  DispenseFulfillmentStatus,
  OpdPrescriptionSnapshot,
  OpdQueueProjectionRow,
  OpdQueueProjectionUpsertInput,
  PharmacyDispenseStatus,
  SaveDispenseForVisitInput,
  SaveWalkInDispenseInput,
  WalkInPatientRecord,
  WalkInQueueSummary,
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

export interface OpdQueueProjectionRepo {
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
  ): Promise<{ items: OpdQueueProjectionRow[]; total: number }>;

  upsert(tenantId: string, input: OpdQueueProjectionUpsertInput): Promise<OpdQueueProjectionRow>;

  updateDispenseStatus(
    tenantId: string,
    visitId: string,
    dispenseStatus: PharmacyDispenseStatus,
  ): Promise<void>;

  deleteByVisitId(tenantId: string, visitId: string): Promise<void>;

  findByVisitId(tenantId: string, visitId: string): Promise<OpdQueueProjectionRow | undefined>;
}

export type PharmacyRepos = {
  dispenseRecordRepo: DispenseRecordRepo;
  walkInDispenseRepo: WalkInDispenseRepo;
  opdQueueProjectionRepo: OpdQueueProjectionRepo;
};

export type PharmacyGatewayPorts = {
  opdGateway: OpdGatewayPort;
  masterDataGateway: MasterDataGatewayPort;
  userLookup: UserLookupPort;
};

export type PharmacyHandlerDeps = PharmacyGatewayPorts & PharmacyRepos;
