import type {
  CreateAddressData,
  CreateIdentifierData,
  CreatePatientData,
  PatientStatus,
  UpdateAddressData,
  UpdatePatientData,
} from "./patient.types.js";

/** POST /patients — body only; `iq_tenant_id` comes from request context. */
export type RegisterPatientRequestBody = Omit<CreatePatientData, "iq_tenant_id">;

export type UpdatePatientRequestBody = UpdatePatientData;

export type LinkIdentifierRequestBody = Omit<
  CreateIdentifierData,
  "iq_tenant_id" | "patient_id"
>;

export type CreateAddressRequestBody = Omit<
  CreateAddressData,
  "iq_tenant_id" | "patient_id"
>;

export type UpdateAddressRequestBody = UpdateAddressData;

export interface ChangePatientStatusRequestBody {
  status: PatientStatus;
}
