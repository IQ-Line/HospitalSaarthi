/**
 * Visit registration form payload (browser) — full desk capture for **Create Visit**.
 *
 * **Submit flow (sequential, via `executeCreateVisitFlow`):**
 * 1. registration-svc — new-patient workflow (real)
 * 2. appointment-svc — stub (`createAppointmentStub`)
 * 3. billing-svc — charges, finalize, payment (`executeVisitRegistrationBilling`)
 * 4. registration-svc — `POST .../complete` (real)
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

/** Values keyed by master-data visitpad vital `code`. */
export type VisitRegistrationVitalsBlock = Record<string, number | string | null | undefined>;

export interface VisitRegistrationAppointmentBlock {
  department_id?: string;
  /** Resolved from master-data when `department_id` changes (tariff + charge ingest). */
  department_name?: string;
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
  /** Line discount percentage (0–100). Syncs discount (₹) when edited in the UI. */
  discount_percent: number;
  /** Line discount amount in rupees. */
  discount: number;
  /** Tariff `service_code` for `POST /charges` (`item_code`). */
  item_code?: string;
  /** Display label from tariff catalog. */
  service_name?: string;
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
    gender: 'male' | 'female' | 'other' | '';
    date_of_birth?: string | null;
    age_years?: number | null;
    age_months?: number | null;
    age_days?: number | null;
    email?: string | null;
    blood_group?: string | null;
    /** Populated from ABHA wizard / verify flow; persisted via registration API when supported */
    abha_number?: string | null;
    abha_address?: string | null;
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
  /** Visit UUID for API routes and billing FK. */
  id: string | null;
  /** Formatted visit identifier from sequence configuration. */
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
  visit_type_label?: string | null;
  department_id: string | null;
  doctor_id: string | null;
  appointment_id: string | null;
  registration_status: string;
  registration_status_label?: string | null;
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

/** `GET /api/registration/v1/visits` — encounter row from registration.visit. */
export interface RegistrationVisitResponse {
  /** Visit UUID for API routes (create-rx, nurse vitals). */
  id: string;
  /** Formatted visit number from sequence configuration. */
  visit_id: string;
  iq_tenant_id: string;
  patient_id: string;
  visit_type: string | null;
  status: string;
  facility_id: string | null;
  department_id: string | null;
  doctor_id: string | null;
  appointment_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrationVisitListPageResponse {
  data: RegistrationVisitResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** `POST .../workflows/new-patient/registrations` — registration row with patient snapshot. */
export type CreateNewPatientRegistrationResponse = RegistrationListItemResponse;
