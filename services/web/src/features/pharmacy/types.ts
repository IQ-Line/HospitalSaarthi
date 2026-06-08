export type WalkInPatient = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  gender: string;
  date_of_birth: string | null;
  created_at: string;
};

export type SaveWalkInPatientInput = {
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  gender: string;
  date_of_birth?: string | null;
};

export type SaveWalkInDispenseInput = {
  walk_in_patient: SaveWalkInPatientInput;
  discount?: string | null;
  notes?: string | null;
  lines: SaveDispenseLineInput[];
};

export type WalkInDispenseResponse = {
  record_id: string;
  walk_in_order: true;
  walk_in_patient: WalkInPatient;
  subtotal: string;
  discount: string;
  total_amount: string;
  notes: string | null;
  has_dispense: boolean;
  created_at: string;
  lines: DispenseLineItem[];
};

export type WalkInPatientDraft = {
  first_name: string;
  last_name: string;
  phone: string;
  gender: '' | 'male' | 'female' | 'other';
  date_of_birth: string;
};

export type PharmacyQueueStatusFilter = 'all' | 'pending' | 'issued';

export type PharmacyQueueDateRange = {
  queued_from: string;
  queued_to: string;
};

export type PharmacyQueueItem = {
  walk_in_order: boolean;
  record_id: string | null;
  visit_id: string | null;
  patient_id: string | null;
  walk_in_patient_id: string | null;
  prescription_id: string | null;
  doctor_id: string | null;
  visit_status: string;
  prescription_status: string | null;
  updated_at: string;
  finalized_at: string | null;
  medicine_count: number;
  patient_name: string | null;
  uhid: string | null;
  phone: string | null;
  age_years: number | null;
  gender: string | null;
  doctor_name: string | null;
  has_dispense: boolean;
};

export type PharmacyQueueListParams = {
  page: number;
  limit: number;
  queued_from?: string;
  queued_to?: string;
  q?: string;
  status?: PharmacyQueueStatusFilter;
};

export type PharmacyQueueListResponse = {
  items: PharmacyQueueItem[];
  total: number;
  page: number;
  limit: number;
};

export type OpdPrescriptionMedicineLine = {
  line_no: number;
  name: string;
  strength: string | null;
  dosage: string | null;
  duration: string | null;
  frequency: string | null;
  quantity: string | null;
  route: string | null;
};

export type OpdPrescriptionSnapshot = {
  prescription_id: string;
  visit_id: string;
  patient_id: string;
  visit_status: string;
  prescription_status: string;
  medicines: OpdPrescriptionMedicineLine[];
};

export type DispenseLineItem = {
  id: string;
  medicine_display_name: string;
  prescribed_quantity: string | null;
  quantity_dispensed: string;
  unit_amount: string;
  line_discount: string;
  tax_percent: string;
  tax_amount: string;
  line_total: string;
  created_at: string;
};

export type DispenseForVisitResponse = {
  visit_id: string;
  patient_id: string;
  opd_prescription_id: string | null;
  subtotal: string;
  discount: string;
  total_amount: string;
  notes: string | null;
  has_dispense: boolean;
  record_id: string | null;
  created_at: string | null;
  lines: DispenseLineItem[];
  opd_prescription: OpdPrescriptionSnapshot | null;
};

export type SaveDispenseLineInput = {
  medicine_display_name: string;
  prescribed_quantity?: string | null;
  quantity_dispensed: string;
  unit_amount: string;
  line_discount?: string | null;
  tax_percent?: string | null;
};

export type SaveDispenseForVisitInput = {
  patient_id: string;
  opd_prescription_id?: string | null;
  discount?: string | null;
  notes?: string | null;
  lines: SaveDispenseLineInput[];
};

/** Editable row in the dispense billing table (client-only key). */
export type DispenseLineDraft = {
  key: string;
  medicine_display_name: string;
  prescribed_quantity: string;
  quantity_dispensed: string;
  unit_amount: string;
  line_discount: string;
  tax_percent: string;
};
