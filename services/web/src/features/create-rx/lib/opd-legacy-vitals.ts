/** Maps Create RX vitals grid codes to OPD legacy_vitals API keys. */
const FORM_TO_LEGACY: Record<string, string> = {
  systolic_bp: 'bp_systolic',
  diastolic_bp: 'bp_diastolic',
  pulse_rate: 'pulse_bpm',
  temperature: 'temperature_c',
  spo2: 'spo2_percent',
  height: 'height_cm',
  weight: 'weight_kg',
  random_blood_sugar: 'blood_sugar_mg_dl',
  bmi: 'bmi',
  respiratory_rate: 'respiratory_rate',
};

const LEGACY_TO_FORM: Record<string, string> = Object.fromEntries(
  Object.entries(FORM_TO_LEGACY).map(([form, legacy]) => [legacy, form]),
);

function coerceLegacyValue(value: string): string | number {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const num = Number(trimmed);
  if (!Number.isNaN(num)) return num;
  return trimmed;
}

export function formVitalsToLegacyVitals(
  vitals: Record<string, string>,
): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [code, raw] of Object.entries(vitals)) {
    const value = raw?.trim();
    if (!value) continue;
    const key = FORM_TO_LEGACY[code] ?? code;
    out[key] = coerceLegacyValue(value);
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function legacyVitalsToFormVitals(
  legacy: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!legacy) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(legacy)) {
    if (raw == null || raw === '') continue;
    const code = LEGACY_TO_FORM[key] ?? key;
    out[code] = String(raw);
  }
  return out;
}
