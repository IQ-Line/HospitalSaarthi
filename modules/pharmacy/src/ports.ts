import type {
  DispenseLineItemRecord,
  DispenseRecord,
  OpdCompletedVisitSummary,
  OpdPrescriptionSnapshot,
  SaveDispenseForVisitInput,
  SaveWalkInDispenseInput,
  WalkInPatientRecord,
  WalkInQueueSummary,
} from "./domain/pharmacy.types.js";

export interface OpdGatewayPort {
  listCompletedVisits(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      queued_from?: string;
      queued_to?: string;
      bearerToken?: string;
    },
  ): Promise<{
    items: OpdCompletedVisitSummary[];
    total: number;
    page: number;
    limit: number;
  }>;

  getVisitPrescription(
    tenantId: string,
    visitId: string,
    bearerToken?: string,
  ): Promise<OpdPrescriptionSnapshot | null>;
}

export interface EmpiGatewayPort {
  getPatientSummary(
    tenantId: string,
    patientId: string,
    bearerToken?: string,
  ): Promise<Record<string, unknown> | null>;
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
  created_by?: string | null;
};

export interface WalkInDispenseRepo {
  findByRecordId(tenantId: string, recordId: string): Promise<WalkInDispenseDetail | undefined>;
  listForQueue(
    tenantId: string,
    options?: {
      queued_from?: string;
      queued_to?: string;
    },
  ): Promise<WalkInQueueSummary[]>;
  create(tenantId: string, payload: UpsertWalkInDispensePayload): Promise<WalkInDispenseDetail>;
  upsert(
    tenantId: string,
    recordId: string,
    payload: UpsertWalkInDispensePayload,
  ): Promise<WalkInDispenseDetail>;
}

export type PharmacyRepos = {
  dispenseRecordRepo: DispenseRecordRepo;
  walkInDispenseRepo: WalkInDispenseRepo;
};

export type PharmacyGatewayPorts = {
  opdGateway: OpdGatewayPort;
  empiGateway: EmpiGatewayPort;
  masterDataGateway: MasterDataGatewayPort;
  userLookup: UserLookupPort;
};

export type PharmacyHandlerDeps = PharmacyGatewayPorts & PharmacyRepos;
