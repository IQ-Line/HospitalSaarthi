/**
 * Visit registration form payload (browser).
 * Submit maps this to EMPI create-patient via BFF `POST /api/empi/v1/patients`.
 * Optional / dummy sections are marked; future BFF orchestration may add OPD visit create.
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
