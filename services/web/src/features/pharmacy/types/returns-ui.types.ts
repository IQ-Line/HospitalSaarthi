export type DispenseReturnReason =
  | 'wrong_medicine_dispensed'
  | 'doctor_discontinued_medication'
  | 'duplicate_dispensing'
  | 'excess_quantity_dispensed'
  | 'patient_refused_medicine'
  | 'other';

export type DispenseReturnVerification = {
  unopened: boolean;
  packaging_intact: boolean;
  expiry_verified: boolean;
};

export type DispenseReturnSearchHit = {
  dispense_id: string;
  dispense_number: string;
  visit_id: string;
  patient_id: string;
  patient_name: string | null;
  uhid: string | null;
  phone: string | null;
  formatted_visit_id: string | null;
  prescription_id: string | null;
  dispense_date: string;
  dispense_status: string;
  total_amount: string;
  pharmacist_id: string | null;
};

export type DispenseReturnSearchResponse = {
  items: DispenseReturnSearchHit[];
  total: number;
  page: number;
  limit: number;
};

export type DispenseReturnEligibleLine = {
  dispense_line_item_id: string;
  medicine_id: string | null;
  medicine_display_name: string;
  stock_batch_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  quantity_dispensed: string;
  quantity_returned: string;
  eligible_return_qty: string;
  unit_amount: string;
  line_discount: string;
  tax_percent: string;
  tax_amount: string;
  line_total: string;
};

export type DispenseReturnEligibilityResponse = {
  dispense_id: string;
  dispense_number: string;
  visit_id: string;
  patient_id: string;
  patient_name: string | null;
  uhid: string | null;
  formatted_visit_id: string | null;
  prescription_id: string | null;
  dispense_date: string;
  dispense_status: string;
  total_amount: string;
  inventory_store_id: string | null;
  pharmacist_id: string | null;
  pharmacist_name: string | null;
  lines: DispenseReturnEligibleLine[];
};

export type ProcessDispenseReturnLineInput = {
  dispense_line_item_id: string;
  return_qty: string;
  stock_batch_id?: string | null;
};

export type ProcessDispenseReturnInput = {
  dispense_id: string;
  return_reason: DispenseReturnReason;
  remarks?: string | null;
  verification: DispenseReturnVerification;
  lines: ProcessDispenseReturnLineInput[];
};

export type DispenseReturnLineDetail = {
  id: string;
  dispense_line_item_id: string;
  medicine_id: string | null;
  medicine_display_name: string;
  stock_batch_id: string | null;
  return_qty: string;
  unit_amount: string;
  line_discount: string;
  tax_amount: string;
  return_amount: string;
};

export type DispenseReturnSummary = {
  id: string;
  return_number: string;
  dispense_id: string;
  dispense_number: string;
  return_reason: DispenseReturnReason;
  total_return_amount: string;
  processed_at: string;
  patient_name: string | null;
  uhid: string | null;
  formatted_visit_id: string | null;
};

export type DispenseReturnListResponse = {
  items: DispenseReturnSummary[];
  total: number;
  page: number;
  limit: number;
};

export type DispenseReturnDetail = {
  id: string;
  return_number: string;
  dispense_id: string;
  dispense_number: string;
  visit_id: string;
  patient_id: string;
  patient_name: string | null;
  uhid: string | null;
  formatted_visit_id: string | null;
  prescription_id: string | null;
  return_reason: DispenseReturnReason;
  remarks: string | null;
  verification: DispenseReturnVerification;
  total_return_amount: string;
  processed_at: string;
  processed_by: string | null;
  processed_by_name: string | null;
  lines: DispenseReturnLineDetail[];
};

export type DispenseReturnSearchParams = {
  q?: string;
  bill_number?: string;
  dispense_number?: string;
  prescription_number?: string;
  uhid?: string;
  patient_name?: string;
  mobile?: string;
  page?: number;
  limit?: number;
};

export type DispenseReturnListParams = {
  q?: string;
  page?: number;
  limit?: number;
};

export type ReturnLineDraft = {
  selected: boolean;
  return_qty: string;
};
