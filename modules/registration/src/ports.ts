import type { DbInstance } from "@hims/ts-sdk-db";
import type {
  CreateRegistrationInput,
  InsertRegistrationResult,
  ListRegistrationsParams,
  RegistrationRecord,
  RegistrationStatus,
} from "./domain/registration.types.js";
import type { PatientDemographicsSnapshot } from "./domain/registration.types.js";

export interface RegistrationRepo {
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<RegistrationRecord | undefined>;
  insert(
    tenantId: string,
    input: CreateRegistrationInput,
    idempotencyKey: string,
    actorId: string,
    registrationStatus: RegistrationStatus,
  ): Promise<InsertRegistrationResult>;
  findById(
    tenantId: string,
    registrationId: string,
  ): Promise<RegistrationRecord | undefined>;
  listPage(
    tenantId: string,
    params: ListRegistrationsParams,
  ): Promise<{ rows: RegistrationRecord[]; total: number }>;
  updateStatus(
    tenantId: string,
    registrationId: string,
    toStatus: RegistrationStatus,
    actorId: string,
  ): Promise<RegistrationRecord | undefined>;
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
  | { ok: false; kind: "error"; status: number; body: string };

export interface EmpiHttpPort {
  registerPatient(
    tenantId: string,
    idempotencyKey: string,
    body: Record<string, unknown>,
  ): Promise<EmpiRegisterPatientResult>;
}

export type { DbInstance };
