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
import type { TenantFollowUpConfig } from "./lib/follow-up.js";
import type { EmpiPatientWire } from "./lib/registration-helpers.js";

export type { TenantFollowUpConfig };

export interface RegistrationRepo {
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<RegistrationRecord | undefined>;
  findByPatientId(
    tenantId: string,
    patientId: string,
  ): Promise<RegistrationRecord | undefined>;
  findPatientIdByAbhaAddress(
    tenantId: string,
    abhaAddress: string,
  ): Promise<string | undefined>;
  findAllPatientIdsByAbhaAddress(
    tenantId: string,
    abhaAddress: string,
  ): Promise<string[]>;
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
  findLatestByPatientAndDepartment(
    tenantId: string,
    patientId: string,
    departmentId: string,
  ): Promise<VisitRecord | undefined>;
  countFreeFollowUpVisits(
    tenantId: string,
    patientId: string,
    departmentId: string,
  ): Promise<number>;
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
  linkAbhaAddress(
    tenantId: string,
    patientId: string,
    abhaAddress: string,
    actorId?: string,
    bearerToken?: string,
  ): Promise<{ ok: true } | { ok: false; reason: "conflict" | "error"; status: number }>;
  resolvePatientId(
    tenantId: string,
    query: {
      patient_id?: string;
      uhid?: string;
      abha_number?: string;
      abha_address?: string;
      phone_number?: string;
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      gender?: string;
      date_of_birth?: string;
      age_years?: number;
      age_months?: number;
      age_days?: number;
    },
    bearerToken?: string,
  ): Promise<string | null>;
  fetchPatientDetail(
    tenantId: string,
    patientId: string,
    bearerToken?: string,
  ): Promise<{
    patient: EmpiPatientWire;
    abha_number?: string | null;
    abha_address?: string | null;
    addresses?: Array<{ id: string; address_type: string }>;
  } | null>;
  upsertPermanentAddress(
    tenantId: string,
    patientId: string,
    address: Record<string, unknown>,
    actorId?: string,
    bearerToken?: string,
  ): Promise<void>;
}

export interface ConfiguratorHttpPort {
  getTenantFollowUpConfig(tenantId: string): Promise<TenantFollowUpConfig>;
}

/**
 * Minimal structured logger (pino-compatible) so use-cases can surface
 * swallowed cross-module degradations instead of returning silent success.
 */
export interface RegistrationLogger {
  warn(detail: Record<string, unknown>, message: string): void;
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

export type BillingVisitType = "OPD" | "IPD" | "ER" | "DAYCARE" | "WALK_IN";

export type BillingPaymentMethod = "CASH" | "CARD" | "UPI" | "CHEQUE" | "BANK_TRANSFER";

export interface BillingCaptureChargeInput {
  patient_id: string;
  visit_id?: string | null;
  visit_type?: BillingVisitType;
  source_module: string;
  source_ref?: string | null;
  item_code: string;
  provider_id?: string | null;
  department?: string | null;
  line_discount_percentage?: number;
}

export interface BillingCaptureChargeResult {
  bill_id: string;
}

export interface BillingRecordPaymentInput {
  bill_id: string;
  amount: number;
  payment_method: BillingPaymentMethod;
  notes?: string;
}

export interface BillingWritePort {
  captureCharge(
    tenantId: string,
    input: BillingCaptureChargeInput,
    idempotencyKey: string,
    bearerToken?: string,
  ): Promise<BillingCaptureChargeResult>;
  applyBillDiscount(
    tenantId: string,
    billId: string,
    discountAmount: number,
    discountReason?: string,
    bearerToken?: string,
  ): Promise<void>;
  finalizeBill(tenantId: string, billId: string, bearerToken?: string): Promise<void>;
  recordPayment(
    tenantId: string,
    input: BillingRecordPaymentInput,
    idempotencyKey: string,
    bearerToken?: string,
  ): Promise<void>;
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
