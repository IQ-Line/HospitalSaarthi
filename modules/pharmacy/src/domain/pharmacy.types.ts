export const PHARMACY_MODULE_KEY = "pharmacy" as const;

export type DispenseFulfillmentStatus = "issued" | "partial_issue";

export type PharmacyDispenseStatus = "pending" | DispenseFulfillmentStatus;

export type DispenseRecord = {
  id: string;
  iq_tenant_id: string;
  walk_in_order: boolean;
  walk_in_patient_id: string | null;
  visit_id: string | null;
  patient_id: string | null;
  opd_prescription_id: string | null;
  subtotal: string;
  discount: string;
  total_amount: string;
  notes: string | null;
  dispense_status: DispenseFulfillmentStatus;
  created_at: Date;
  created_by: string | null;
};

export type WalkInPatientRecord = {
  id: string;
  iq_tenant_id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  gender: string;
  date_of_birth: string | null;
  created_at: Date;
};

export type DispenseLineItemRecord = {
  id: string;
  iq_tenant_id: string;
  dispense_record_id: string;
  medicine_id: string | null;
  medicine_display_name: string;
  prescribed_quantity: string | null;
  quantity_dispensed: string;
  unit_amount: string;
  line_discount: string;
  tax_percent: string;
  tax_amount: string;
  line_total: string;
  created_at: Date;
};

export type OpdCompletedVisitSummary = {
  visit_id: string;
  patient_id: string;
  prescription_id: string | null;
  doctor_id: string | null;
  visit_status: string;
  prescription_status: string | null;
  updated_at: string;
  finalized_at: string | null;
  medicine_count: number;
};

export type WalkInQueueSummary = {
  record_id: string;
  walk_in_patient_id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  gender: string;
  date_of_birth: string | null;
  created_at: Date;
  medicine_count: number;
  has_dispense: boolean;
  dispense_status: PharmacyDispenseStatus;
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
  dispense_status: PharmacyDispenseStatus;
};

export type OpdPrescriptionMedicineLine = {
  line_no: number;
  medicine_id: string | null;
  name: string;
  strength: string | null;
  dosage: string | null;
  duration: string | null;
  frequency: string | null;
  quantity: string | null;
  route: string | null;
  catalog_unit_price?: string | null;
};

export type OpdPrescriptionSnapshot = {
  prescription_id: string;
  visit_id: string;
  patient_id: string;
  visit_status: string;
  prescription_status: string;
  doctor_id: string | null;
  doctor_name: string | null;
  finalized_at: string | null;
  vitals_summary: string | null;
  complaints_summary: string | null;
  diagnosis_summary: string | null;
  medicines: OpdPrescriptionMedicineLine[];
};

export type SaveDispenseLineInput = {
  medicine_id: string;
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
  walk_in_patient: WalkInPatientRecord;
  subtotal: string;
  discount: string;
  total_amount: string;
  notes: string | null;
  has_dispense: boolean;
  dispense_status: PharmacyDispenseStatus;
  created_at: string;
  lines: DispenseLineItemRecord[];
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
  dispense_status: PharmacyDispenseStatus;
  record_id: string | null;
  created_at: string | null;
  lines: DispenseLineItemRecord[];
  /** Full OPD prescription for sidebar display (all prescribed medicines). */
  opd_prescription: OpdPrescriptionSnapshot | null;
  /** Catalog-backed medicines eligible for the dispense billing table. */
  dispensable_medicines: OpdPrescriptionMedicineLine[];
};
