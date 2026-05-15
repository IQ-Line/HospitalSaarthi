import type { DbInstance } from "@hims/ts-sdk-db";
import type {
  CreateRegistrationInput,
  ListRegistrationsParams,
  RegistrationRecord,
} from "./domain/registration.types.js";

export interface RegistrationRepo {
  insert(
    tenantId: string,
    input: CreateRegistrationInput,
  ): Promise<RegistrationRecord>;
  findById(
    tenantId: string,
    registrationId: string,
  ): Promise<RegistrationRecord | undefined>;
  listPage(
    tenantId: string,
    params: ListRegistrationsParams & { patientIds?: string[] },
  ): Promise<{ rows: RegistrationRecord[]; total: number }>;
}

export interface EmpiHttpPort {
  registerPatient(
    tenantId: string,
    body: Record<string, unknown>,
  ): Promise<
    | { ok: true; patientId: string }
    | { ok: false; status: 409; body: unknown }
    | { ok: false; status: number; body: string }
  >;
  searchPatientIds(
    tenantId: string,
    filters: { uhid?: string; mobile?: string; name?: string },
  ): Promise<string[]>;
  getPatientSummary(
    tenantId: string,
    patientId: string,
  ): Promise<{
    uhid: string;
    full_name: string;
    phone_number: string;
  } | null>;
}

export type { DbInstance };
