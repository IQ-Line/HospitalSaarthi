export type PatientStatus = "active" | "inactive" | "deceased";

export type Gender = "male" | "female" | "other";

export type Salutation = "Mr" | "Mrs" | "Ms" | "Dr" | "Master" | "Baby";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export type AddressType = "permanent" | "current" | "temporary";

export type IdentifierType =
  | "abha_address"
  | "phr_address"
  | "legacy_mrn"
  | "insurance_id"
  | "other";

export interface Patient {
  id: string;
  iq_tenant_id: string;
  uhid: string;
  abha_number: string | null;
  salutation: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  full_name: string;
  father_name: string | null;
  mother_name: string | null;
  date_of_birth: string | null;
  year_of_birth: number | null;
  age_years: number | null;
  age_months: number | null;
  age_days: number | null;
  gender: Gender;
  phone_number: string;
  alternate_phone: string | null;
  blood_group: BloodGroup | null;
  occupation: string | null;
  nationality: string;
  education: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  status: PatientStatus;
  merged_into_id: string | null;
  registered_by: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreatePatientData {
  iq_tenant_id: string;
  abha_number?: string | null;
  salutation?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  date_of_birth?: string | null;
  year_of_birth?: number | null;
  age_years?: number | null;
  age_months?: number | null;
  age_days?: number | null;
  gender: Gender;
  phone_number: string;
  alternate_phone?: string | null;
  blood_group?: BloodGroup | null;
  occupation?: string | null;
  nationality?: string;
  education?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  registered_by?: string | null;
  created_by?: string | null;
  force_create?: boolean;
}

export interface UpdatePatientData {
  salutation?: string | null;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  date_of_birth?: string | null;
  year_of_birth?: number | null;
  age_years?: number | null;
  age_months?: number | null;
  age_days?: number | null;
  gender?: Gender;
  phone_number?: string;
  alternate_phone?: string | null;
  blood_group?: BloodGroup | null;
  occupation?: string | null;
  nationality?: string;
  education?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  abha_number?: string | null;
  updated_by?: string | null;
}

export interface PatientFilters {
  name?: string;
  phone_number?: string;
  uhid?: string;
  abha_number?: string;
  status?: PatientStatus;
  page?: number;
  limit?: number;
}

export interface PatientAddress {
  id: string;
  iq_tenant_id: string;
  patient_id: string;
  address_type: AddressType;
  street: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateAddressData {
  iq_tenant_id: string;
  patient_id: string;
  address_type: AddressType;
  street?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  created_by?: string | null;
}

export interface UpdateAddressData {
  address_type?: AddressType;
  street?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  updated_by?: string | null;
}

export interface PatientIdentifier {
  id: string;
  iq_tenant_id: string;
  patient_id: string;
  identifier_type: IdentifierType;
  identifier_value: string;
  issuing_system: string | null;
  source_record_id: string | null;
  is_active: boolean;
  created_at: Date;
  created_by: string | null;
}

export interface CreateIdentifierData {
  iq_tenant_id: string;
  patient_id: string;
  identifier_type: IdentifierType;
  identifier_value: string;
  issuing_system?: string | null;
  source_record_id?: string | null;
  created_by?: string | null;
}

export interface PatientSourceRecord {
  id: string;
  iq_tenant_id: string;
  patient_id: string;
  source_system: string;
  source_reference: string | null;
  demographics_snapshot: Record<string, unknown>;
  contributed_at: Date;
  contributed_by: string | null;
}

export interface CreateSourceRecordData {
  iq_tenant_id: string;
  patient_id: string;
  source_system: string;
  source_reference?: string | null;
  demographics_snapshot: Record<string, unknown>;
  contributed_by?: string | null;
}
