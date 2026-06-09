/** M3 HIU consent — constants and payload helpers (aligned with integration-hub OpenAPI). */

export const M3_CONSENT_PURPOSES = [
  { code: 'CAREMGT', label: 'Care Management' },
  { code: 'BTG', label: 'Break the Glass' },
  { code: 'PUBHLTH', label: 'Public Health' },
  { code: 'HPAYMT', label: 'Healthcare Payment' },
  { code: 'DSRCH', label: 'Disease Specific Healthcare Research' },
  { code: 'PATRQT', label: 'Self Requested' },
] as const;

export type M3PurposeCode = (typeof M3_CONSENT_PURPOSES)[number]['code'];

export const M3_HI_TYPES = [
  { label: 'Diagnostic Record', value: 'DiagnosticReport' },
  { label: 'Discharge Summary', value: 'DischargeSummary' },
  { label: 'OP Consultation Note', value: 'OPConsultation' },
  { label: 'Prescription Record', value: 'Prescription' },
  { label: 'Immunization Record', value: 'ImmunizationRecord' },
  { label: 'Invoice Record', value: 'Invoice' },
  { label: 'Wellness Record', value: 'WellnessRecord' },
  { label: 'Health Document', value: 'HealthDocumentRecord' },
] as const;

export type M3HiType = (typeof M3_HI_TYPES)[number]['value'];

export const M3_ACCESS_DURATION_MONTHS = [2, 3, 6, 9] as const;

/** NHA consent init requires non-empty requester `identifier.value` (sandbox e2e uses REG001). */
export const DEFAULT_M3_REQUESTER_REG_NO = 'REG001';

export const M3_CONSENT_TERMINAL_STATES = new Set([
  'CONSENT_GRANTED',
  'CONSENT_DENIED',
  'EXPIRED',
]);

export const M3_TRANSFER_TERMINAL_STATES = new Set(['ACKNOWLEDGED', 'EXPIRED']);

export function defaultConsentDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 2);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

/** Default consent expiry — 7 days, end of day (for `datetime-local` input). */
export function defaultDataEraseAtLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${toDateInputValue(d)}T23:59`;
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateRangeFromMonths(months: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - months);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

/** Date-only inputs → ISO instants for CM permission window. */
export function toConsentDateRangeIso(from: string, to: string): { from: string; to: string } {
  return {
    from: `${from}T00:00:00.000Z`,
    to: `${to}T23:59:59.999Z`,
  };
}

export function consentStatusLabel(state: string | undefined): string {
  switch (state) {
    case 'CONSENT_INIT_REQUESTED':
      return 'Initiated';
    case 'AWAITING_PATIENT_APPROVAL':
      return 'Awaiting patient approval';
    case 'CONSENT_GRANTED':
      return 'Granted';
    case 'CONSENT_DENIED':
      return 'Denied';
    case 'EXPIRED':
      return 'Expired';
    case 'DATA_REQUESTED':
      return 'Data requested';
    case 'AWAITING_PUSH':
      return 'Awaiting records from facility';
    case 'ACKNOWLEDGED':
      return 'Records received';
    default:
      return state ?? 'Unknown';
  }
}
