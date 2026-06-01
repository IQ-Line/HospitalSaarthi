import type { DbInstance } from "@hims/ts-sdk-db";
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

export type { DbInstance };
