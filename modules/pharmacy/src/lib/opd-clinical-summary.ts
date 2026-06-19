type FormDataRecord = Record<string, unknown>;

function asRecord(value: unknown): FormDataRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as FormDataRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function trimString(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function formatTemperature(raw: string): string {
  const num = Number(raw);
  if (!Number.isFinite(num)) return raw;
  if (num <= 45) {
    const fahrenheit = num * (9 / 5) + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  }
  return `${num.toFixed(1)}°F`;
}

export function formatVitalsSummary(vitals: unknown): string | null {
  const record = asRecord(vitals);
  if (!record) return null;

  const parts: string[] = [];
  const temperature = trimString(record.temperature);
  if (temperature) parts.push(`Temp: ${formatTemperature(temperature)}`);

  const height = trimString(record.height);
  if (height) parts.push(`Ht: ${height} cm`);

  const weight = trimString(record.weight);
  if (weight) parts.push(`Wt: ${weight} kg`);

  const pulse = trimString(record.pulse_rate ?? record.pulse);
  if (pulse) parts.push(`Pulse: ${pulse}`);

  const systolic = trimString(record.systolic_bp);
  const diastolic = trimString(record.diastolic_bp);
  if (systolic && diastolic) {
    parts.push(`BP: ${systolic}/${diastolic}`);
  } else if (systolic) {
    parts.push(`BP: ${systolic}`);
  }

  const spo2 = trimString(record.spo2);
  if (spo2) parts.push(`SpO₂: ${spo2}%`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

function complaintText(row: unknown): string {
  const record = asRecord(row);
  if (!record) return "";

  const text =
    trimString(record.complaint) ||
    trimString(record.complaint_text) ||
    trimString(record.text);
  return text;
}

export function formatComplaintsSummary(formData: FormDataRecord): string | null {
  const camel = asArray(formData.chiefComplaints);
  const snake = asArray(formData.chief_complaints);
  const rows = camel.length > 0 ? camel : snake;

  const parts = rows.map(complaintText).filter((text) => text.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function diagnosisText(row: unknown): string {
  const record = asRecord(row);
  if (!record) return "";

  const notes = trimString(record.notes);
  if (!notes) return "";

  const certainty = trimString(record.certainty);
  if (certainty === "confirmed") return `${notes} — confirmed`;
  if (certainty === "presumed") return `${notes} — presumed`;
  return notes;
}

export function formatDiagnosisSummary(formData: FormDataRecord): string | null {
  const rows = asArray(formData.diagnosis);
  const parts = rows.map(diagnosisText).filter((text) => text.length > 0);
  return parts.length > 0 ? parts.join("; ") : null;
}

export type OpdClinicalSummary = {
  vitals_summary: string | null;
  complaints_summary: string | null;
  diagnosis_summary: string | null;
};

export function clinicalSummaryFromFormData(formData: unknown): OpdClinicalSummary {
  const record = asRecord(formData);
  if (!record) {
    return {
      vitals_summary: null,
      complaints_summary: null,
      diagnosis_summary: null,
    };
  }

  return {
    vitals_summary: formatVitalsSummary(record.vitals),
    complaints_summary: formatComplaintsSummary(record),
    diagnosis_summary: formatDiagnosisSummary(record),
  };
}
