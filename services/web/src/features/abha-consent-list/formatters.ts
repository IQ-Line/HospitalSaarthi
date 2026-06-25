import type { ConsentDisplayStatus } from './api';

const HI_TYPE_LABELS: Record<string, string> = {
  DiagnosticReport: 'Diagnostic Record',
  DischargeSummary: 'Discharge Summary',
  OPConsultation: 'OP Consultation Note',
  Prescription: 'Prescription Record',
  ImmunizationRecord: 'Immunization Record',
  Invoice: 'Invoice Record',
  WellnessRecord: 'Wellness Record',
  HealthDocumentRecord: 'Health Document',
};

export function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function formatConsentDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatConsentDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatConsentDate(value)}, ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;
}

export function hiTypeLabel(type: string): string {
  return HI_TYPE_LABELS[type] ?? type;
}

export function statusBadgeClass(status: ConsentDisplayStatus): string {
  switch (status) {
    case 'GRANTED':
      return 'border-green-300 bg-green-50 text-green-600';
    case 'DENIED':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'REVOKED':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'EXPIRED':
      return 'border-gray-200 bg-gray-100 text-gray-600';
    default:
      return 'border-gray-300 bg-white text-gray-700';
  }
}

export function statusLabel(status: ConsentDisplayStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function hiTypesDisplayList(types: string[]): string[] {
  return types.map(hiTypeLabel);
}

export function parseBundleEntryTitle(content: string, careContextReference?: string): string {
  try {
    const parsed = JSON.parse(content) as {
      type?: string;
      entry?: Array<{ resource?: { resourceType?: string; title?: string } }>;
    };
    const composition = parsed.entry?.find((e) => e.resource?.resourceType === 'Composition')
      ?.resource;
    if (composition?.title) return composition.title;
    if (parsed.type) return parsed.type.replace(/Record$/, '');
  } catch {
    // fall through
  }
  return careContextReference ?? 'Health Record';
}
