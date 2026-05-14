export type RegistrationStatus = string;

export interface Registration {
  registration_id: string;
  iq_tenant_id: string;
  visit_id: string | null;
  patient_id: string;
  facility_id: string | null;
  visit_type: string | null;
  department_id: string | null;
  provider_id: string | null;
  appointment_id: string | null;
  registration_status: RegistrationStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Fields accepted on create (tenant from request context). */
export interface CreateRegistrationData {
  patient_id: string;
  visit_id?: string | null;
  facility_id?: string | null;
  visit_type?: string | null;
  department_id?: string | null;
  provider_id?: string | null;
  appointment_id?: string | null;
  registration_status?: RegistrationStatus;
  created_by?: string | null;
}
