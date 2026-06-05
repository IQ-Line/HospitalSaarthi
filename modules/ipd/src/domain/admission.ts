export type AdmissionType = "IPD" | "DAYCARE";
export type AdmissionSource = "OPD" | "EMERGENCY" | "DIRECT" | "BABY_CRADLE";
export type AdmissionStatus = "draft" | "pending" | "active" | "cancelled" | "discharged";
export type PayerType = "self" | "insurance" | "corporate" | "government";

export interface Admission {
  admission_id: string;
  iq_tenant_id: string;
  admission_number: string;
  patient_id: string;
  registration_visit_id: string | null;
  source_visit_id: string | null;
  admission_type: AdmissionType;
  admission_source: AdmissionSource;
  facility_id: string;
  department_id: string | null;
  intended_ward_code: string | null;
  admitting_doctor_id: string | null;
  attending_doctor_id: string | null;
  status: AdmissionStatus;
  admission_datetime: string | null;
  expected_discharge_date: string | null;
  chief_complaint: string | null;
  provisional_diagnosis: string | null;
  payer_type: PayerType;
  insurance_reference: string | null;
  companion_name: string | null;
  companion_phone: string | null;
  remarks: string | null;
  mother_admission_id: string | null;
  deposit_required: boolean;
  deposit_amount: string | null;
  deposit_bill_id: string | null;
  deposit_collected_at: string | null;
  ward_code: string | null;
  ward_name: string | null;
  bed_label: string | null;
  bed_assigned_at: string | null;
  patient_uhid: string;
  patient_full_name: string;
  patient_phone: string | null;
  patient_gender: string | null;
  patient_date_of_birth: string | null;
  cancel_reason: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdmissionListQuery {
  status?: string[];
  admission_source?: string;
  admission_type?: string;
  facility_id?: string;
  intended_ward_code?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface DashboardStats {
  admissions_today: number;
  discharges_today: number;
  pending_admissions: number;
  active_admissions: number;
  deposit_clearance_pending: number;
}

export interface AdmissionRepo {
  list(tenantId: string, query: AdmissionListQuery): Promise<{
    data: Admission[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }>;
  getById(tenantId: string, admissionId: string): Promise<Admission | null>;
  getByIdempotencyKey(tenantId: string, key: string): Promise<Admission | null>;
  getByRegistrationVisitId(tenantId: string, visitId: string): Promise<Admission | null>;
  insert(row: Admission): Promise<Admission>;
  update(tenantId: string, admissionId: string, patch: Partial<Admission>): Promise<Admission | null>;
  dashboardStats(tenantId: string): Promise<DashboardStats>;
  nextAdmissionNumber(tenantId: string): Promise<string>;
}

export function toApi(row: Admission) {
  return { ...row, deposit_collected: row.deposit_collected_at !== null };
}
