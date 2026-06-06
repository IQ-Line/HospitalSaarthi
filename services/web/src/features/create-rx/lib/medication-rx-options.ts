import type { VisitpadSelectOption } from './visitpad-catalog-options';

/** Rx medication dropdown options — aligned with legacy Visitpad UI screenshots. */
export const MEDICATION_DOSAGE_FORM_OPTIONS: VisitpadSelectOption[] = [
  { label: 'Tablet', value: 'Tablet' },
  { label: 'Capsule', value: 'Capsule' },
  { label: 'Injection', value: 'Injection' },
  { label: 'Syrup', value: 'Syrup' },
];

export const MEDICATION_ROUTE_OPTIONS: VisitpadSelectOption[] = [
  { label: 'Oral', value: 'Oral' },
  { label: 'IV', value: 'IV' },
  { label: 'IM', value: 'IM' },
];

export const MEDICATION_FREQUENCY_OPTIONS: VisitpadSelectOption[] = [
  { label: 'Once Daily', value: 'Once Daily' },
  { label: 'Twice Daily', value: 'Twice Daily' },
  { label: 'Thrice Daily', value: 'Thrice Daily' },
];

export const MEDICATION_TOA_OPTIONS: VisitpadSelectOption[] = [
  { label: 'After Meals', value: 'After Meals' },
  { label: 'Empty Stomach', value: 'Empty Stomach' },
  { label: 'At Bedtime', value: 'At Bedtime' },
  { label: 'SOS', value: 'SOS' },
];

const ROUTE_CODE_TO_LABEL: Record<string, string> = {
  oral: 'Oral',
  iv: 'IV',
  im: 'IM',
};

const FREQUENCY_CODE_TO_LABEL: Record<string, string> = {
  od: 'Once Daily',
  qd: 'Once Daily',
  once_daily: 'Once Daily',
  'once daily': 'Once Daily',
  bid: 'Twice Daily',
  twice_daily: 'Twice Daily',
  'twice daily': 'Twice Daily',
  tid: 'Thrice Daily',
  thrice_daily: 'Thrice Daily',
  'thrice daily': 'Thrice Daily',
};

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function resolveMedicationRouteLabel(codeOrName: string | null | undefined): string {
  const trimmed = (codeOrName ?? '').trim();
  if (!trimmed) return '';

  const fromCode = ROUTE_CODE_TO_LABEL[normalizeLookupKey(trimmed).replace(/_/g, '')] ??
    ROUTE_CODE_TO_LABEL[normalizeLookupKey(trimmed)];
  if (fromCode) return fromCode;

  const fromOptions = MEDICATION_ROUTE_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === trimmed.toLowerCase(),
  );
  return fromOptions?.value ?? trimmed;
}

export function resolveMedicationFrequencyLabel(codeOrName: string | null | undefined): string {
  const trimmed = (codeOrName ?? '').trim();
  if (!trimmed) return '';

  const key = normalizeLookupKey(trimmed);
  const fromCode = FREQUENCY_CODE_TO_LABEL[key] ?? FREQUENCY_CODE_TO_LABEL[key.replace(/_/g, ' ')];
  if (fromCode) return fromCode;

  const fromOptions = MEDICATION_FREQUENCY_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === trimmed.toLowerCase(),
  );
  return fromOptions?.value ?? trimmed;
}

export function resolveMedicationToaLabel(instruction: string | null | undefined): string {
  const trimmed = (instruction ?? '').trim();
  if (!trimmed) return '';

  const fromOptions = MEDICATION_TOA_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === trimmed.toLowerCase(),
  );
  return fromOptions?.value ?? trimmed;
}

export function resolveMedicationDosageFormLabel(form: string | null | undefined): string {
  const trimmed = (form ?? '').trim();
  if (!trimmed) return '';

  const fromOptions = MEDICATION_DOSAGE_FORM_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === trimmed.toLowerCase(),
  );
  return fromOptions?.value ?? trimmed;
}
