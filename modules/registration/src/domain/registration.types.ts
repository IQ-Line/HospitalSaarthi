export interface RegistrationRecord {
  registration_id: string;
  iq_tenant_id: string;
  visit_id: string | null;
  patient_id: string;
  facility_id: string | null;
  visit_type: string | null;
  department_id: string | null;
  provider_id: string | null;
  appointment_id: string | null;
  registration_status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRegistrationInput {
  patient_id: string;
  visit_id?: string | null;
  facility_id?: string | null;
  visit_type?: string | null;
  department_id?: string | null;
  provider_id?: string | null;
  appointment_id?: string | null;
  registration_status?: string;
  created_by?: string | null;
}

export interface NewPatientIntakeInput {
  patient: Record<string, unknown>;
  visit_id?: string | null;
  facility_id?: string | null;
  visit_type?: string | null;
  department_id?: string | null;
  provider_id?: string | null;
  appointment_id?: string | null;
  registration_status?: string;
  created_by?: string | null;
}

export interface ListRegistrationsParams {
  page: number;
  limit: number;
  uhid?: string;
  mobile?: string;
  name?: string;
}

export interface RegistrationListItem extends RegistrationRecord {
  patient_uhid: string | null;
  patient_full_name: string | null;
  patient_phone_number: string | null;
}

export interface RegistrationListPage {
  data: RegistrationListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
