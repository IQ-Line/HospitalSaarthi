/**
 * Visit registration form payload (browser).
 * Submit maps to registration `POST /api/registration/v1/workflows/new-patient/registrations`
 * (EMPI create + encounter row). Optional / dummy sections are marked.
 */
export interface VisitRegistrationAddressBlock {
  line1: string;
  line2: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
}

export interface CreateVisitRequestBody {
  /** Branch / site context (UI); backend may map to tenant metadata later. */
  branch_id?: string | null;
  patient: {
    phone: string;
    first_name: string;
    middle_name?: string | null;
    last_name?: string | null;
    gender: 'male' | 'female' | 'other';
    date_of_birth?: string | null;
    age_years?: number | null;
    age_months?: number | null;
    age_days?: number | null;
    email?: string | null;
    blood_group?: string | null;
    /** Dummy until EMPI / ABHA integration */
    abha_number?: string | null;
  };
  /** Dummy until attendant API exists */
  attendant: {
    relation: string;
    name: string;
    phone: string;
  };
  permanent_address: VisitRegistrationAddressBlock;
  residential_address: VisitRegistrationAddressBlock;
  residential_same_as_permanent: boolean;
  /** Dummy extras not on patient API yet */
  other?: {
    education?: string | null;
    occupation?: string | null;
    religion?: string | null;
  };
  notes?: {
    referral?: string | null;
    additional?: string | null;
  };
}

/** `POST /api/empi/v1/patients` via BFF — subset of EMPI `Patient` used by the UI. */
export interface RegisterPatientResponse {
  id: string;
  uhid: string;
  full_name: string;
  status?: string;
}

/** `GET /api/registration/v1/registrations` — list item (registration + optional patient snapshot). */
export interface RegistrationListItemResponse {
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
  created_at: string;
  updated_at: string;
  patient_uhid: string | null;
  patient_full_name: string | null;
  patient_phone_number: string | null;
}

export interface RegistrationListPageResponse {
  data: RegistrationListItemResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** `POST .../workflows/new-patient/registrations` — core row plus optional patient fields for UI. */
export interface CreateNewPatientRegistrationResponse {
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
  created_at: string;
  updated_at: string;
  patient_uhid?: string | null;
  patient_full_name?: string | null;
  patient_phone_number?: string | null;
}
