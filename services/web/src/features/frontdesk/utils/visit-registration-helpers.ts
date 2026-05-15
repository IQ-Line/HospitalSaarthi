import type { CreateVisitRequestBody } from '@/features/frontdesk/types';

/** EMPI `blood_group` enum — single source for UI selects and create-patient mapping. */
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

// ─── Date of birth → age (local calendar) ───────────────────────────────────

/** Parse `YYYY-MM-DD` (from `<input type="date">`) as a local calendar date. */
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

/**
 * Completed years, months, and days from birth to reference
 * (both interpreted as local calendar dates at start-of-day).
 */
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

// ─── Form → EMPI register patient body ─────────────────────────────────────

/**
 * Maps visit registration form values to EMPI `POST /patients` JSON
 * (`createPatientBodySchema` — only known keys, no extras).
 */
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

/**
 * Maps visit registration form values to registration `POST .../workflows/new-patient/registrations`
 * body (`patient` uses the same shape as EMPI create patient).
 */
export function mapVisitRegistrationToNewPatientIntakeBody(
  data: CreateVisitRequestBody,
): Record<string, unknown> {
  return {
    patient: mapVisitRegistrationToEmpiCreatePatient(data),
    registration_status: 'pending',
  };
}
