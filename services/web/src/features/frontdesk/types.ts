/**
 * Visit registration form payload (browser) — full desk capture for **Create Visit**.
 *
 * **Submit flow (sequential, as APIs land):**
 * 1. registration-svc — new-patient workflow (wired today via `executeCreateVisitFlow`)
 * 2. appointment-svc — after registration succeeds (not wired)
 * 3. billing-svc — after appointment succeeds (not wired)
 *
 * Sections marked UI-only are kept on this object for the form; only phase-1 fields are
 * mapped to the registration API (see `mapVisitRegistrationToNewPatientIntakeBody`).
 */
export interface VisitRegistrationAddressBlock {
  line1: string;
  line2: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
}

export interface VisitRegistrationVitalsBlock {
  weight_kg?: number | null;
  height_cm?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  pulse_bpm?: number | null;
  temp_celsius?: number | null;
  spo2_percent?: number | null;
  resp_rate_per_min?: number | null;
}

export interface VisitRegistrationAppointmentBlock {
  department_id?: string;
  room_number?: string;
  provider_id?: string;
  visit_type_code?: string;
  visit_reason?: string;
}

export interface VisitRegistrationLabTestsBlock {
  search_query?: string;
}

export interface VisitRegistrationRisBlock {
  modality?: string;
  study_type?: string;
  body_region?: string;
  priority?: string;
  booking_type?: string;
  /** `datetime-local` value */
  scheduled_at?: string;
  referring_doctor?: string;
  /** `yes` | `no` */
  contrast_required?: string;
  prep_instructions?: string;
  notes?: string;
  clinical_indication?: string;
}

export interface VisitRegistrationBillingFeeLine {
  unit_price: number;
  tax_percent: number;
  discount: number;
}

export interface VisitRegistrationBillingBlock {
  add_item_search?: string;
  registration_fee: VisitRegistrationBillingFeeLine;
  consultation_fee: VisitRegistrationBillingFeeLine;
  invoice_discount: number;
  payment_mode?: string;
  amount_paid?: number | null;
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
  /** UI-only until vitals API is integrated */
  vitals?: VisitRegistrationVitalsBlock;
  appointment?: VisitRegistrationAppointmentBlock;
  /** UI-only until LIS order API is integrated */
  lab_tests?: VisitRegistrationLabTestsBlock;
  /** UI-only until radiology / RIS module is integrated */
  ris_appointment?: VisitRegistrationRisBlock;
  /** UI-only until billing module is integrated */
  billing?: VisitRegistrationBillingBlock;
}

/** `POST /api/empi/v1/patients` via BFF — subset of EMPI `Patient` used by the UI. */
export interface RegisterPatientResponse {
  id: string;
  uhid: string;
  full_name: string;
  status?: string;
}

/** `GET /api/registration/v1/registrations` — list item with frozen patient snapshot. */
export interface RegistrationListItemResponse {
  registration_id: string;
  iq_tenant_id: string;
  visit_id: string | null;
  patient_id: string;
  patient_uhid: string;
  patient_abha_number?: string | null;
  patient_abha_address?: string | null;
  patient_full_name: string;
  patient_phone_number: string;
  patient_gender?: string | null;
  patient_date_of_birth?: string | null;
  patient_year_of_birth?: number | null;
  patient_source_record_id: string;
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
}

export interface RegistrationListPageResponse {
  data: RegistrationListItemResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** `POST .../workflows/new-patient/registrations` — registration row with patient snapshot. */
export type CreateNewPatientRegistrationResponse = RegistrationListItemResponse;
