/** UI-only types for pharmacy dispense workspace — swap mock adapters for API types later. */

export type DispenseAddressDraft = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
};

export type DispensePatientDraft = {
  patient_id: string | null;
  phone: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: '' | 'male' | 'female' | 'other';
  date_of_birth: string;
  age_years: string;
  age_months: string;
  age_days: string;
  email: string;
  blood_group: string;
  uhid: string;
  abha_number: string;
  aadhaar: string;
  attendant_relation: string;
  attendant_name: string;
  attendant_phone: string;
  permanent_address: DispenseAddressDraft;
  residential_address: DispenseAddressDraft;
  residential_same_as_permanent: boolean;
  education: string;
  occupation: string;
  religion: string;
};

export type DispenseIssuedItemRow = {
  key: string;
  item_code: string;
  medicine_id: string | null;
  medicine_display_name: string;
  quantity: string;
  available_qty: string;
  batch: string;
  mrp: string;
  line_discount: string;
  tax_percent: string;
};

export type DispensePaymentDraft = {
  payment_mode: string;
  amount_paid: string;
};

export type DispensePrescriptionMedicine = {
  name: string;
  dosage: string;
  duration: string;
};

export type DispensePrescriptionCard = {
  id: string;
  label: string;
  doctor_name: string;
  issued: boolean;
  vitals?: string;
  complaints?: string;
  diagnosis?: string;
  medicines: DispensePrescriptionMedicine[];
};

export type DispenseVisitOption = {
  id: string;
  label: string;
};

export type DispensePatientSearchResult = {
  id: string;
  first_name: string;
  last_name: string;
  uhid: string;
  mrn: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  email: string;
};
