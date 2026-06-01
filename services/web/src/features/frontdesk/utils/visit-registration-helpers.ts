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
] as const;

export const VISIT_REGISTRATION_LAB_TEST_CATALOG = [
  { code: 'CBC', name: 'Complete Blood Count', department: 'Haematology' },
  { code: 'LFT', name: 'Liver Function Test', department: 'Biochemistry' },
  { code: 'KFT', name: 'Kidney Function Test', department: 'Biochemistry' },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone', department: 'Endocrinology' },
  { code: 'HBA1C', name: 'HbA1c', department: 'Biochemistry' },
  { code: 'URINE-R/M', name: 'Urine Routine & Microscopy', department: 'Pathology' },
] as const;

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

export function isVisitRegistrationGrandTotalPositive(grandTotal: number): boolean {
  return Number.isFinite(grandTotal) && grandTotal > 0;
}

export function isVisitRegistrationPaymentModeSelected(paymentMode: string | undefined): boolean {
  return Boolean(paymentMode?.trim());
}

const VISIT_REG_PHONE_RE = /^\d{10}$/;

export type VisitRegistrationFormGateInput = {
  phone: string | undefined;
  firstName: string | undefined;
  grandTotal: number;
  paymentMode: string | undefined;
  hasProvider?: boolean;
  consultationUnitPrice?: number;
  registrationItemCode?: string;
  consultationItemCode?: string;
};

export function visitRegistrationFormBlockers(
  args: VisitRegistrationFormGateInput,
): string[] {
  const missing: string[] = [];
  if (!VISIT_REG_PHONE_RE.test((args.phone ?? '').trim())) missing.push('10-digit phone');
  if (!args.firstName?.trim()) missing.push('first name');
  if (!isVisitRegistrationGrandTotalPositive(args.grandTotal)) missing.push('billing total above ₹0');
  // TODO: re-enable tariff gates after Tariff Master rows exist (API integration testing).
  // if (args.hasProvider && (args.consultationUnitPrice ?? 0) <= 0) {
  //   missing.push('consultation fee above ₹0');
  // }
  // if (!args.registrationItemCode?.trim()) {
  //   missing.push('registration tariff');
  // }
  // if (args.hasProvider && !args.consultationItemCode?.trim()) {
  //   missing.push('consultation tariff');
  // }
  if (!args.paymentMode?.trim()) missing.push('payment mode');
  return missing;
}

export function isVisitRegistrationFormComplete(args: VisitRegistrationFormGateInput): boolean {
  return visitRegistrationFormBlockers(args).length === 0;
}

export function visitRegistrationBlockHint(args: VisitRegistrationFormGateInput): string | undefined {
  const missing = visitRegistrationFormBlockers(args);
  return missing.length ? `Required: ${missing.join(', ')}` : undefined;
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

  const doctorId = optionalUuid(apt?.provider_id);
  if (doctorId) body.doctor_id = doctorId;

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

/** Payload shape for appointment-svc (stub until service exists). */
export function mapVisitRegistrationToAppointmentBody(
  form: CreateVisitRequestBody,
  registration: { registration_id: string; patient_id: string },
): Record<string, unknown> {
  const apt = form.appointment;
  return {
    registration_id: registration.registration_id,
    patient_id: registration.patient_id,
    department_id: optionalUuid(apt?.department_id),
    room_number: apt?.room_number?.trim() || null,
    provider_id: optionalUuid(apt?.provider_id),
    visit_type_code: apt?.visit_type_code?.trim() || null,
    visit_reason: apt?.visit_reason?.trim() || null,
    vitals: form.vitals ?? null,
    lab_tests: form.lab_tests ?? null,
    ris_appointment: form.ris_appointment ?? null,
  };
}

/** Payload shape for billing-svc (stub until service exists). */
export function mapVisitRegistrationToBillingBody(
  form: CreateVisitRequestBody,
  ctx: { registration_id: string; appointment_id: string; patient_id: string },
): Record<string, unknown> {
  return {
    registration_id: ctx.registration_id,
    appointment_id: ctx.appointment_id,
    patient_id: ctx.patient_id,
    billing: form.billing ?? null,
    grand_total: form.billing
      ? computeBillingGrandTotal(
          form.billing.registration_fee,
          form.billing.consultation_fee,
          form.billing.invoice_discount ?? 0,
        )
      : null,
  };
}
