export type EmpiPatientQueueFields = {
  patient_name: string | null;
  uhid: string | null;
  age_years: number | null;
  gender: string | null;
};

function readPatientObject(payload: Record<string, unknown>): Record<string, unknown> | null {
  const patient = payload.patient;
  if (patient != null && typeof patient === "object" && !Array.isArray(patient)) {
    return patient as Record<string, unknown>;
  }
  return payload;
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readAgeYears(row: Record<string, unknown>): number | null {
  const value = row.age_years;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  return null;
}

export function mapEmpiPayloadToQueuePatientFields(
  payload: Record<string, unknown> | null,
): EmpiPatientQueueFields {
  if (payload == null) {
    return {
      patient_name: null,
      uhid: null,
      age_years: null,
      gender: null,
    };
  }

  const patient = readPatientObject(payload);
  if (patient == null) {
    return {
      patient_name: null,
      uhid: null,
      age_years: null,
      gender: null,
    };
  }

  const fullName = readString(patient, "full_name");
  const firstName = readString(patient, "first_name");
  const lastName = readString(patient, "last_name");
  const nameParts = [firstName, lastName].filter((part): part is string => part != null).join(" ").trim();
  const composed = fullName ?? (nameParts.length > 0 ? nameParts : null);

  return {
    patient_name: composed,
    uhid: readString(patient, "uhid"),
    age_years: readAgeYears(patient),
    gender: readString(patient, "gender"),
  };
}
