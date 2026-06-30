import type { ConsentListDataPushedEntry } from './api';

const PROFILE_BUNDLE_TYPE: Record<string, string> = {
  'https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord': 'OPConsultRecord',
  'https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord': 'PrescriptionRecord',
  'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord': 'DiagnosticReportRecord',
  'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord': 'DischargeSummaryRecord',
  'https://nrces.in/ndhm/fhir/r4/StructureDefinition/ImmunizationRecord': 'ImmunizationRecord',
  'https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord': 'HealthDocumentRecord',
  'https://nrces.in/ndhm/fhir/r4/StructureDefinition/WellnessRecord': 'WellnessRecord',
};

export const BUNDLE_TYPE_LABELS: Record<string, string> = {
  OPConsultRecord: 'Consultation Notes',
  PrescriptionRecord: 'Prescription record',
  DiagnosticReportRecord: 'Diagnostic Report - Lab',
  DischargeSummaryRecord: 'Discharge Summary',
  ImmunizationRecord: 'Immunization record',
  HealthDocumentRecord: 'Health Document',
  WellnessRecord: 'Wellness Record',
  Composition: 'Clinical Document',
  document: 'Health Record',
};

type FhirResource = Record<string, unknown>;

export interface TransformedBundleView {
  id: string;
  bundleType: string;
  CompositionInfo?: Array<Record<string, unknown>>;
  PatientInfo?: Array<Record<string, unknown>>;
  PractitionerInfo?: Array<Record<string, unknown>>;
  EncounterInfo?: Array<Record<string, unknown>>;
  DiagnosticReportInfo?: Array<Record<string, unknown>>;
  ImmunizationInfo?: Array<Record<string, unknown>>;
  AttachmentRefs?: ConsentListDataPushedEntry['AttachmentRefs'];
}

function profileToBundleType(profile?: string): string | undefined {
  if (!profile) return undefined;
  const base = profile.split('|')[0] ?? profile;
  return PROFILE_BUNDLE_TYPE[base];
}

function humanName(name?: unknown): string {
  if (!Array.isArray(name) || !name.length) return 'N/A';
  const n = (name.find((item) => (item as FhirResource).use === 'official') ?? name[0]) as FhirResource;
  if (typeof n.text === 'string' && n.text.trim()) return n.text.trim();
  const given = Array.isArray(n.given) ? n.given.join(' ') : '';
  const family = typeof n.family === 'string' ? n.family : '';
  return `${given} ${family}`.trim() || 'N/A';
}

function codeableText(concept?: unknown): string {
  if (!concept || typeof concept !== 'object') return '';
  const c = concept as FhirResource;
  if (typeof c.text === 'string' && c.text.trim()) return c.text.trim();
  const coding = Array.isArray(c.coding) ? c.coding[0] : undefined;
  if (coding && typeof coding === 'object') {
    const cd = coding as FhirResource;
    return (typeof cd.display === 'string' && cd.display) || (typeof cd.code === 'string' && cd.code) || '';
  }
  return '';
}

function processIdentifier(identifier?: unknown): { type?: string; value: string } | undefined {
  if (!identifier || typeof identifier !== 'object') return undefined;
  const id = identifier as FhirResource;
  return {
    type: codeableText(id.type) || undefined,
    value: typeof id.value === 'string' ? id.value : 'N/A',
  };
}

function processPeriod(period?: unknown): string | undefined {
  if (!period || typeof period !== 'object') return undefined;
  const p = period as FhirResource;
  const start = typeof p.start === 'string' ? p.start : '';
  const end = typeof p.end === 'string' ? p.end : '';
  if (!start && !end) return undefined;
  return `From: ${start || '?'} - Until: ${end || '?'}`;
}

function processTelecom(telecom?: unknown): string | undefined {
  if (!telecom || typeof telecom !== 'object') return undefined;
  const t = telecom as FhirResource;
  if (typeof t.value !== 'string') return undefined;
  const use = typeof t.use === 'string' ? ` (${t.use})` : '';
  return `${t.value}${use}`;
}

function resolveRefDisplay(ref: unknown, byUrl: Map<string, FhirResource>): string | undefined {
  if (!ref || typeof ref !== 'object') return undefined;
  const r = ref as FhirResource;
  if (typeof r.display === 'string' && r.display.trim()) return r.display.trim();
  const reference = typeof r.reference === 'string' ? r.reference : '';
  if (!reference) return undefined;
  const resource = byUrl.get(reference);
  if (!resource) return undefined;
  if (resource.resourceType === 'Organization' && typeof resource.name === 'string') return resource.name;
  if (resource.resourceType === 'Practitioner') return humanName(resource.name);
  if (resource.resourceType === 'Patient') return humanName(resource.name);
  return undefined;
}

function indexBundleResources(bundle: FhirResource): Map<string, FhirResource> {
  const map = new Map<string, FhirResource>();
  const entries = bundle.entry;
  if (!Array.isArray(entries)) return map;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as FhirResource;
    const resource = e.resource as FhirResource | undefined;
    if (!resource) continue;
    const fullUrl = typeof e.fullUrl === 'string' ? e.fullUrl : undefined;
    if (fullUrl) map.set(fullUrl, resource);
    if (typeof resource.id === 'string') {
      map.set(resource.id, resource);
      map.set(`${resource.resourceType}/${resource.id}`, resource);
    }
  }
  return map;
}

function processResource(resource: FhirResource, fullUrl?: string): { type: string; data: Record<string, unknown> } | null {
  const resourceType = resource.resourceType;
  if (resourceType === 'Patient') {
    return {
      type: 'PatientInfo',
      data: {
        name: humanName(resource.name),
        gender: resource.gender,
        telecom: Array.isArray(resource.telecom)
          ? resource.telecom.map(processTelecom).filter(Boolean)
          : [],
        identifier: Array.isArray(resource.identifier)
          ? resource.identifier.map(processIdentifier).filter(Boolean)
          : [],
        birthDate: resource.birthDate,
        fullUrl,
      },
    };
  }
  if (resourceType === 'Practitioner') {
    const quals = Array.isArray(resource.qualification) ? resource.qualification : [];
    const qualification =
      quals
        .map((q) => (q && typeof q === 'object' ? codeableText((q as FhirResource).code) : ''))
        .filter(Boolean)
        .join(', ') || 'N/A';
    return {
      type: 'PractitionerInfo',
      data: {
        name: humanName(resource.name),
        identifier: Array.isArray(resource.identifier)
          ? resource.identifier.map(processIdentifier).filter(Boolean)
          : [],
        qualification,
        fullUrl,
      },
    };
  }
  if (resourceType === 'Encounter') {
    const encClass =
      resource.class && typeof resource.class === 'object' ? codeableText(resource.class) : '';
    return {
      type: 'EncounterInfo',
      data: {
        type: Array.isArray(resource.type)
          ? resource.type.map(codeableText).filter(Boolean).join(', ')
          : 'N/A',
        period: processPeriod(resource.period),
        status: resource.status,
        class: encClass,
        identifier: Array.isArray(resource.identifier)
          ? resource.identifier.map(processIdentifier).filter(Boolean)
          : [],
        fullUrl,
      },
    };
  }
  if (resourceType === 'Composition') {
    return {
      type: 'CompositionInfo',
      data: {
        title: resource.title ?? 'Untitled Document',
        status: resource.status,
        date: resource.date,
        custodian: resource.custodian,
        fullUrl,
      },
    };
  }
  if (resourceType === 'DiagnosticReport') {
    return {
      type: 'DiagnosticReportInfo',
      data: {
        effectiveDateTime: resource.effectiveDateTime,
        issued: resource.issued,
        fullUrl,
      },
    };
  }
  if (resourceType === 'Immunization') {
    return {
      type: 'ImmunizationInfo',
      data: {
        occurrence: resource.occurrenceDateTime ?? resource.occurrenceString,
        fullUrl,
      },
    };
  }
  return null;
}

export function transformFhirBundleForView(
  contentJson: string,
  entry?: ConsentListDataPushedEntry,
): TransformedBundleView {
  let bundle: FhirResource;
  try {
    bundle = JSON.parse(contentJson) as FhirResource;
  } catch {
    return {
      id: entry?.id ?? entry?.careContextReference ?? 'unknown',
      bundleType: entry?.bundleType ?? 'HealthRecord',
      AttachmentRefs: entry?.AttachmentRefs,
      ...(entry?.CompositionInfo ? { CompositionInfo: entry.CompositionInfo } : {}),
    };
  }

  const bundleId =
    (typeof bundle.id === 'string' && bundle.id) ||
    entry?.id ||
    entry?.careContextReference ||
    'unknown';

  const byUrl = indexBundleResources(bundle);
  const result: TransformedBundleView = {
    id: bundleId,
    bundleType: 'HealthRecord',
    AttachmentRefs: entry?.AttachmentRefs,
  };

  const entries = bundle.entry;
  if (Array.isArray(entries)) {
    for (const item of entries) {
      if (!item || typeof item !== 'object') continue;
      const e = item as FhirResource;
      const resource = e.resource as FhirResource | undefined;
      if (!resource) continue;
      const processed = processResource(resource, typeof e.fullUrl === 'string' ? e.fullUrl : undefined);
      if (!processed) continue;
      const key = processed.type as keyof TransformedBundleView;
      const list = (result[key] as Array<Record<string, unknown>> | undefined) ?? [];
      list.push(processed.data);
      (result as Record<string, unknown>)[processed.type] = list;
    }
  }

  const composition = Array.isArray(bundle.entry)
    ? (bundle.entry.find((e) => (e as FhirResource).resource?.resourceType === 'Composition') as
        | FhirResource
        | undefined)?.resource as FhirResource | undefined
    : undefined;

  const compositionProfile = Array.isArray(composition?.meta && (composition.meta as FhirResource).profile)
    ? ((composition.meta as FhirResource).profile as string[])[0]
    : undefined;
  const bundleProfile = Array.isArray(bundle.meta && (bundle.meta as FhirResource).profile)
    ? ((bundle.meta as FhirResource).profile as string[])[0]
    : undefined;

  result.bundleType =
    profileToBundleType(compositionProfile) ??
    profileToBundleType(bundleProfile) ??
    (typeof bundle.type === 'string' ? bundle.type : 'HealthRecord');

  if (result.CompositionInfo?.[0]) {
    const comp = result.CompositionInfo[0];
    const custodianRef = comp.custodian;
    const display = resolveRefDisplay(custodianRef, byUrl);
    if (display) comp.custodian = { display };
  }

  if (entry?.bundleType) result.bundleType = entry.bundleType;
  if (entry?.CompositionInfo?.[0]?.title && result.CompositionInfo?.[0]) {
    result.CompositionInfo[0].title = entry.CompositionInfo[0].title;
  }

  return result;
}

export function recordDisplayType(entry: ConsentListDataPushedEntry, view: TransformedBundleView): string {
  const title = view.CompositionInfo?.[0]?.title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  if (entry.bundleType && BUNDLE_TYPE_LABELS[entry.bundleType]) return BUNDLE_TYPE_LABELS[entry.bundleType];
  if (view.bundleType && BUNDLE_TYPE_LABELS[view.bundleType]) return BUNDLE_TYPE_LABELS[view.bundleType];
  return view.bundleType?.replace(/Record$/, '') || 'Health Record';
}

export function extractPeriodStart(period: unknown): string | null {
  if (!period) return null;
  if (typeof period === 'string') {
    const parts = period.split(' - Until:');
    if (parts[0]) return parts[0].replace(/^From:\s*/i, '').trim() || null;
    return null;
  }
  if (typeof period === 'object' && period !== null && typeof (period as FhirResource).start === 'string') {
    return (period as FhirResource).start as string;
  }
  return null;
}

export function formatRecordDate(value: string | null | undefined): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRecordDay(value: string | null | undefined): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatPeriodRange(period: unknown): { from: string; until: string } {
  if (!period) return { from: 'N/A', until: 'N/A' };
  if (typeof period === 'string') {
    const [fromStr, untilStr] = period.split(' - ');
    const from = fromStr?.replace(/^From:\s*/i, '').trim() ?? '';
    const until = untilStr?.replace(/^Until:\s*/i, '').trim() ?? '';
    return { from: formatRecordDate(from || null), until: formatRecordDate(until || null) };
  }
  if (typeof period === 'object' && period !== null) {
    const p = period as FhirResource;
    return {
      from: formatRecordDate(typeof p.start === 'string' ? p.start : null),
      until: formatRecordDate(typeof p.end === 'string' ? p.end : null),
    };
  }
  return { from: 'N/A', until: 'N/A' };
}

export function generateRecordCaption(view: TransformedBundleView): string {
  const visitStart = extractPeriodStart(view.EncounterInfo?.[0]?.period);
  if (visitStart) return `Visit date on ${formatRecordDay(visitStart)}`;

  const immunization = view.ImmunizationInfo?.[0]?.occurrence;
  if (typeof immunization === 'string') return `Immunization on ${formatRecordDay(immunization)}`;

  const diagnostic =
    view.DiagnosticReportInfo?.[0]?.effectiveDateTime ?? view.DiagnosticReportInfo?.[0]?.issued;
  if (typeof diagnostic === 'string') return `Diagnostic report on ${formatRecordDay(diagnostic)}`;

  const marked = view.CompositionInfo?.[0]?.date;
  if (typeof marked === 'string') return `Bundle edited on ${formatRecordDay(marked)}`;

  return 'Visit date on N/A';
}

export function capitalize(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'N/A';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
