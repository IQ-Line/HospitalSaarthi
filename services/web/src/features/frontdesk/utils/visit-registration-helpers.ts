import type { CreateVisitRequestBody, VisitRegistrationBillingFeeLine } from '@/features/frontdesk/types';

// ─── Dropdown / catalog options (visit registration UI) ─────────────────────

export const EMPI_BLOOD_GROUP_OPTIONS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

const EMPI_BLOOD_GROUP_SET = new Set<string>(EMPI_BLOOD_GROUP_OPTIONS);

export const VISIT_REGISTRATION_DEPARTMENTS = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'General Medicine' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Cardiology' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Orthopaedics' },
] as const;

export const VISIT_REGISTRATION_PROVIDERS: ReadonlyArray<{ id: string; name: string }> = [];

export const VISIT_REGISTRATION_VISIT_TYPES = [
  { value: 'opd_first', label: 'OPD — First visit' },
  { value: 'opd_follow_up', label: 'OPD — Follow-up' },
  { value: 'ipd_admission', label: 'IPD admission' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'daycare', label: 'Day care' },
] as const;

export const VISIT_REGISTRATION_RIS_MODALITIES = [
  { value: 'xray', label: 'X-Ray' },
  { value: 'ct', label: 'CT' },
  { value: 'mri', label: 'MRI' },
  { value: 'usg', label: 'Ultrasound (USG)' },
  { value: 'mammography', label: 'Mammography' },
] as const;

export const VISIT_REGISTRATION_RIS_STUDY_TYPES: Record<
  string,
  ReadonlyArray<{ value: string; label: string }>
> = {
  xray: [
    { value: 'cxr', label: 'Chest X-Ray' },
    { value: 'knee_ap_lat', label: 'Knee AP/LAT' },
  ],
  ct: [
    { value: 'ct_abdomen', label: 'CT Abdomen' },
    { value: 'ct_brain', label: 'CT Brain' },
  ],
  mri: [
    { value: 'mri_brain', label: 'MRI Brain' },
    { value: 'mri_spine', label: 'MRI Spine' },
  ],
  usg: [
    { value: 'usg_abdomen', label: 'USG Abdomen' },
    { value: 'usg_pelvis', label: 'USG Pelvis' },
  ],
  mammography: [{ value: 'mammo_bilateral', label: 'Bilateral mammography' }],
};

export const VISIT_REGISTRATION_RIS_PRIORITIES = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'stat', label: 'STAT' },
] as const;

export const VISIT_REGISTRATION_RIS_BOOKING_TYPES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'emergency', label: 'Emergency' },
] as const;

export const VISIT_REGISTRATION_RIS_CONTRAST_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
] as const;

export const VISIT_REGISTRATION_PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'insurance', label: 'Insurance' },
] as const;

export const VISIT_REGISTRATION_LAB_TEST_CATALOG = [
  { code: 'CBC', name: 'Complete Blood Count', department: 'Haematology' },
  { code: 'LFT', name: 'Liver Function Test', department: 'Biochemistry' },
  { code: 'KFT', name: 'Kidney Function Test', department: 'Biochemistry' },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone', department: 'Endocrinology' },
  { code: 'HBA1C', name: 'HbA1c', department: 'Biochemistry' },
  { code: 'URINE-R/M', name: 'Urine Routine & Microscopy', department: 'Pathology' },
] as const;

const VITAL_FIELDS = [
  { key: 'weight_kg', label: 'Weight (kg)', placeholder: '72.5', step: '0.1' },
  { key: 'height_cm', label: 'Height (cm)', placeholder: '168', step: '1' },
  { key: 'bp_systolic', label: 'BP Systolic', placeholder: '120', step: '1' },
  { key: 'bp_diastolic', label: 'BP Diastolic', placeholder: '80', step: '1' },
  { key: 'pulse_bpm', label: 'Pulse (bpm)', placeholder: '80', step: '1' },
  { key: 'temp_celsius', label: 'Temp (°C)', placeholder: '37.2', step: '0.1' },
  { key: 'spo2_percent', label: 'SpO2 (%)', placeholder: '98', step: '1' },
  { key: 'resp_rate_per_min', label: 'Resp. rate (/min)', placeholder: '16', step: '1' },
] as const satisfies ReadonlyArray<{
  key: keyof NonNullable<CreateVisitRequestBody['vitals']>;
  label: string;
  placeholder: string;
  step: string;
}>;

export { VITAL_FIELDS };

export const VISIT_REGISTRATION_TEXTAREA_CLASS =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

// ─── Billing helpers ───────────────────────────────────────────────────────────

export function billingLineNetPrice(line: VisitRegistrationBillingFeeLine): number {
  const unit = line.unit_price ?? 0;
  const tax = line.tax_percent ?? 0;
  return Math.round(unit * (1 + tax / 100));
}

export function billingLineTotal(line: VisitRegistrationBillingFeeLine): number {
  return billingLineNetPrice(line) - (line.discount ?? 0);
}

export function computeBillingGrandTotal(
  registrationFee: VisitRegistrationBillingFeeLine,
  consultationFee: VisitRegistrationBillingFeeLine,
  invoiceDiscount: number,
): number {
  const subtotal = billingLineTotal(registrationFee) + billingLineTotal(consultationFee);
  return Math.max(0, subtotal - (invoiceDiscount ?? 0));
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─── Date of birth → age ─────────────────────────────────────────────────────

export function parseDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function ageYmdSinceBirth(
  birthLocal: Date,
  referenceLocal: Date,
): { years: number; months: number; days: number } {
  let y = referenceLocal.getFullYear() - birthLocal.getFullYear();
  let mo = referenceLocal.getMonth() - birthLocal.getMonth();
  let d = referenceLocal.getDate() - birthLocal.getDate();
  if (d < 0) {
    mo--;
    d += new Date(referenceLocal.getFullYear(), referenceLocal.getMonth(), 0).getDate();
  }
  if (mo < 0) {
    y--;
    mo += 12;
  }
  return { years: y, months: mo, days: d };
}

// ─── API payload mapping ─────────────────────────────────────────────────────

export function mapVisitRegistrationToEmpiCreatePatient(
  data: CreateVisitRequestBody,
): Record<string, unknown> {
  const p = data.patient;
  const o = data.other;
  const a = data.attendant;

  const body: Record<string, unknown> = {
    first_name: p.first_name.trim(),
    gender: p.gender,
    phone_number: `+91${p.phone}`,
  };

  const mn = p.middle_name?.trim();
  if (mn) body.middle_name = mn;

  const ln = p.last_name?.trim();
  if (ln) body.last_name = ln;

  const dob = p.date_of_birth?.trim();
  if (dob) body.date_of_birth = dob;

  if (typeof p.age_years === 'number' && !Number.isNaN(p.age_years)) {
    body.age_years = p.age_years;
  }
  if (typeof p.age_months === 'number' && !Number.isNaN(p.age_months)) {
    body.age_months = p.age_months;
  }
  if (typeof p.age_days === 'number' && !Number.isNaN(p.age_days)) {
    body.age_days = p.age_days;
  }

  const bg = p.blood_group?.trim();
  if (bg && EMPI_BLOOD_GROUP_SET.has(bg)) {
    body.blood_group = bg;
  }

  const abha = p.abha_number?.trim();
  if (abha) body.abha_number = abha;

  if (o?.education?.trim()) body.education = o.education.trim();
  if (o?.occupation?.trim()) body.occupation = o.occupation.trim();

  const en = a.name?.trim();
  if (en) body.emergency_contact_name = en;

  const er = a.relation?.trim();
  if (er) body.emergency_contact_relationship = er;

  const ep = a.phone?.trim();
  if (ep) body.emergency_contact_phone = ep;

  return body;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuid(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v || !UUID_RE.test(v)) return null;
  return v;
}

export function mapVisitRegistrationToNewPatientIntakeBody(
  data: CreateVisitRequestBody,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    patient: mapVisitRegistrationToEmpiCreatePatient(data),
    intake_completion: 'partial',
  };

  const apt = data.appointment;
  const visitType = apt?.visit_type_code?.trim();
  if (visitType) body.visit_type = visitType;

  const departmentId = optionalUuid(apt?.department_id);
  if (departmentId) body.department_id = departmentId;

  const providerId = optionalUuid(apt?.provider_id);
  if (providerId) body.provider_id = providerId;

  return body;
}

export function defaultVisitRegistrationAddress(): CreateVisitRequestBody['permanent_address'] {
  return {
    line1: '',
    line2: '',
    city: '',
    state: '',
    district: '',
    pincode: '',
  };
}
