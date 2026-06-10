import type { DbInstance } from "@hims/ts-sdk-db";
import type { DashboardRepoMetrics } from "./domain/dashboard.types.js";
import type {
  CreateRegistrationInput,
  InsertRegistrationResult,
  ListRegistrationsParams,
  RegistrationRecord,
} from "./domain/registration.types.js";
import type { PatientDemographicsSnapshot } from "./domain/registration.types.js";
import type {
  CreateVisitInput,
  InsertVisitResult,
  ListVisitsParams,
  UpdateVisitInput,
  VisitRecord,
} from "./domain/visit.types.js";
import type { VisitStatus } from "./lib/visit-helpers.js";

export interface RegistrationRepo {
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<RegistrationRecord | undefined>;
  findByPatientId(
    tenantId: string,
    patientId: string,
  ): Promise<RegistrationRecord | undefined>;
  insert(
    tenantId: string,
    input: CreateRegistrationInput,
    idempotencyKey: string,
    actorId: string,
  ): Promise<InsertRegistrationResult>;
  findById(
    tenantId: string,
    registrationId: string,
  ): Promise<RegistrationRecord | undefined>;
  listPage(
    tenantId: string,
    params: ListRegistrationsParams,
  ): Promise<{ rows: RegistrationRecord[]; total: number }>;
}

export interface VisitRepo {
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<VisitRecord | undefined>;
  insert(
    tenantId: string,
    input: CreateVisitInput,
    formattedVisitId: string,
    idempotencyKey: string,
    actorId: string,
    status: VisitStatus,
  ): Promise<InsertVisitResult>;
  findById(tenantId: string, visitId: string): Promise<VisitRecord | undefined>;
  listPage(
    tenantId: string,
    params: ListVisitsParams,
  ): Promise<{ rows: VisitRecord[]; total: number }>;
  update(
    tenantId: string,
    visitId: string,
    input: UpdateVisitInput,
    actorId: string,
  ): Promise<VisitRecord | undefined>;
  delete(tenantId: string, visitId: string): Promise<boolean>;
  updateStatus(
    tenantId: string,
    visitId: string,
    toStatus: VisitStatus,
    actorId: string,
  ): Promise<VisitRecord | undefined>;
  findLatestByPatientId(
    tenantId: string,
    patientId: string,
  ): Promise<VisitRecord | undefined>;
  findLatestByPatientIds(
    tenantId: string,
    patientIds: readonly string[],
  ): Promise<Map<string, VisitRecord>>;
  getDashboardMetrics(tenantId: string, days: number): Promise<DashboardRepoMetrics>;
}

export type EmpiRegisterPatientResult =
  | {
      ok: true;
      patientId: string;
      sourceRecordId: string;
      snapshot: PatientDemographicsSnapshot;
    }
  | {
      ok: false;
      kind: "duplicate";
      existingPatientId: string;
      sourceRecordId: string;
      snapshot: PatientDemographicsSnapshot;
      body: unknown;
    }
  | { ok: false; kind: "empi_unavailable"; status: number; body: string }
  | { ok: false; kind: "error"; status: number; body: string };

export interface EmpiHttpPort {
  registerPatient(
    tenantId: string,
    idempotencyKey: string,
    body: Record<string, unknown>,
    bearerToken?: string,
  ): Promise<EmpiRegisterPatientResult>;
}

export interface OpdHttpPort {
  ensureEncounter(
    tenantId: string,
    visitId: string,
    patientId: string,
    bearerToken?: string,
    doctorId?: string | null,
  ): Promise<{ ok: true } | { ok: false; status: number; body: string }>;
}

export interface BillingBillSummary {
  billId: string;
  billNumber: string;
  netAmount: string;
  status: string;
}

export interface BillingBillItem {
  description: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  tax_percentage: string;
  department: string | null;
  status: "ACTIVE" | "VOIDED";
}

export interface BillingBillDetail {
  bill: {
    bill_number: string;
    bill_date: string;
    created_at: string;
    discount_amount: string;
    paid_amount: string;
    net_amount: string;
  };
  items: BillingBillItem[];
}

export interface PicklistReadPort {
  getLabelMaps(): Promise<{
    visitTypes: ReadonlyMap<string, string>;
    registrationStatuses: ReadonlyMap<string, string>;
  }>;
}

export interface BillingReadPort {
  listBillsForRegistration(
    tenantId: string,
    registrationId: string,
    options?: { bearerToken?: string; visitId?: string | null },
  ): Promise<BillingBillSummary[]>;
  getBill(
    tenantId: string,
    billId: string,
    options?: { bearerToken?: string },
  ): Promise<BillingBillDetail | null>;
}

export interface ApiKeyValidationResult {
  tenantId: string;
  apiKeyId: string;
  purpose: "opd_slip";
}

export interface ApiKeyValidatorPort {
  validateOpdSlipKey(
    prefix: string,
    secret: string,
  ): Promise<ApiKeyValidationResult | null>;
}

export type { DbInstance };
