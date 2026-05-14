import type { CreateRegistrationData, Registration } from "./domain/registration.types.js";

/** HTTP client to EMPI for new-patient orchestration (injected in service mode). */
export interface EmpiPatientsPort {
  createPatient(
    tenantId: string,
    body: Record<string, unknown>,
  ): Promise<{ patient_id: string }>;
}

export interface RegistrationRepo {
  create(
    tenantId: string,
    data: CreateRegistrationData,
  ): Promise<Registration>;
  findById(
    tenantId: string,
    registrationId: string,
  ): Promise<Registration | undefined>;
}
