import type { SaveWalkInPatientInput } from "../domain/pharmacy.types.js";

const VALID_GENDERS = new Set(["male", "female", "other"]);

export function normalizeWalkInPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const digits = raw.replace(/\D/g, "").slice(-10);
  return digits.length > 0 ? digits : null;
}

export function assertWalkInPatient(
  patient: SaveWalkInPatientInput,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!patient.first_name?.trim()) {
    errors.first_name = "first_name is required";
  }
  if (!patient.gender || !VALID_GENDERS.has(patient.gender)) {
    errors.gender = "gender must be male, female, or other";
  }

  const phone = normalizeWalkInPhone(patient.phone);
  if (patient.phone != null && patient.phone !== "" && phone != null && phone.length !== 10) {
    errors.phone = "phone must be a 10-digit mobile number";
  }

  if (patient.date_of_birth != null && patient.date_of_birth !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(patient.date_of_birth)) {
      errors.date_of_birth = "date_of_birth must be YYYY-MM-DD";
    }
  }

  return errors;
}

export function normalizeWalkInPatientInput(
  patient: SaveWalkInPatientInput,
): SaveWalkInPatientInput {
  return {
    first_name: patient.first_name.trim(),
    last_name: patient.last_name?.trim() || null,
    phone: normalizeWalkInPhone(patient.phone),
    gender: patient.gender,
    date_of_birth: patient.date_of_birth?.trim() || null,
  };
}
