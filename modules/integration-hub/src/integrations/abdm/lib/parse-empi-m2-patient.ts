import type { M2PatientProfile } from "../ports.js";

type EmpiPatientJson = {
  patient?: {
    full_name?: string;
    first_name?: string;
    middle_name?: string | null;
    last_name?: string | null;
    gender?: string;
    year_of_birth?: number | null;
    date_of_birth?: string | null;
    abha_number?: string | null;
    phone_number?: string;
  };
  identifiers?: Array<{ identifier_type?: string; identifier_value?: string }>;
};

function mapGender(gender: string | undefined): M2PatientProfile["gender"] {
  const g = (gender ?? "").toLowerCase();
  if (g === "male") return "M";
  if (g === "female") return "F";
  if (g === "other") return "O";
  return "O";
}

function resolveYearOfBirth(patient: NonNullable<EmpiPatientJson["patient"]>): number | null {
  if (typeof patient.year_of_birth === "number" && patient.year_of_birth > 1900) {
    return patient.year_of_birth;
  }
  if (patient.date_of_birth) {
    const y = new Date(patient.date_of_birth).getFullYear();
    if (!Number.isNaN(y) && y > 1900) return y;
  }
  return null;
}

function resolveAbhaAddress(json: EmpiPatientJson): string | null {
  const fromIdentifier = json.identifiers?.find(
    (i) => i.identifier_type === "abha_address" && i.identifier_value?.trim(),
  )?.identifier_value?.trim();
  if (fromIdentifier) return fromIdentifier;
  const legacy = (json.patient as { abha_address?: string } | undefined)?.abha_address?.trim();
  return legacy || null;
}

function resolvePatientName(patient: NonNullable<EmpiPatientJson["patient"]>): string {
  const full = patient.full_name?.trim();
  if (full) return full;
  return [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function parseEmpiPatientDetail(json: EmpiPatientJson): M2PatientProfile | null {
  const patient = json.patient;
  if (!patient) return null;
  const abhaAddress = resolveAbhaAddress(json);
  if (!abhaAddress) return null;
  const patientName = resolvePatientName(patient);
  if (!patientName) return null;
  const yearOfBirth = resolveYearOfBirth(patient);
  if (yearOfBirth === null) return null;
  return {
    abhaAddress,
    abhaNumber: patient.abha_number?.trim() || undefined,
    patientName,
    gender: mapGender(patient.gender),
    yearOfBirth,
    phoneNo: patient.phone_number?.trim() || undefined,
  };
}
