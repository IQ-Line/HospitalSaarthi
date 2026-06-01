import type { RegistrationRecord } from "../domain/registration.types.js";

const VISIT_TYPE_LABELS: Record<string, string> = {
  opd_first: "OPD — First visit",
  opd_follow_up: "OPD — Follow-up",
  opd_followup: "OPD — Follow-up",
};

export function formatVisitTypeLabel(visitType: string | null): string {
  if (!visitType?.trim()) return "OPD";
  const key = visitType.trim().toLowerCase();
  return VISIT_TYPE_LABELS[key] ?? visitType;
}

export function formatAgeGender(
  gender: string | null,
  dateOfBirth: string | null,
  yearOfBirth: number | null,
): string {
  const genderLabel = gender?.trim() || "—";
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDelta = now.getMonth() - dob.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
        age -= 1;
      }
      return `${String(age)} years / ${genderLabel}`;
    }
  }
  if (yearOfBirth != null) {
    const age = new Date().getFullYear() - yearOfBirth;
    return `${String(age)} years / ${genderLabel}`;
  }
  return genderLabel;
}

export function formatVisitDateTime(createdAt: Date): string {
  return createdAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function formatVisitNumber(record: RegistrationRecord): string {
  const shortId = record.registration_id.slice(0, 8).toUpperCase();
  return record.visit_id ? `VIS-${shortId}` : `REG-${shortId}`;
}

export function formatTokenDisplay(record: RegistrationRecord): string {
  const suffix = record.registration_id.replace(/-/g, "").slice(-4).toUpperCase();
  return `TOKEN: ${suffix}`;
}

export function formatInr(amount: string | number): string {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}
