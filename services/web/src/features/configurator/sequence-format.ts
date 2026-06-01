export const IDENTIFIER_TYPES = [
  'patient_uhid',
  'op_visit',
  'ip_visit',
  'emergency_visit',
  'op_bill',
  'ip_bill',
  'emergency_bill',
] as const;

export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export const SEGMENT_TYPES = [
  'prefix_text',
  'date_format',
  'tenant_code',
  'sequence',
] as const;

export type SegmentType = (typeof SEGMENT_TYPES)[number];

export const DATE_FORMATS = ['YYMMDD', 'YYYYMMDD', 'MMDDYY', 'DDMMYY'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export interface SequenceFormatSegment {
  segment_type: SegmentType;
  enabled: boolean;
  order_index: number;
  date_format?: DateFormat;
  sequence_digits?: number;
  sequence_starts_at?: number;
  prefix_value?: string | null;
}

function enabledSegments(segments: SequenceFormatSegment[]): SequenceFormatSegment[] {
  return [...segments]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order_index - b.order_index);
}

function formatDateSegment(date: Date, format: DateFormat): string {
  const yy = String(date.getFullYear()).slice(-2);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  switch (format) {
    case 'YYMMDD':
      return `${yy}${mm}${dd}`;
    case 'YYYYMMDD':
      return `${yyyy}${mm}${dd}`;
    case 'MMDDYY':
      return `${mm}${dd}${yy}`;
    case 'DDMMYY':
      return `${dd}${mm}${yy}`;
    default:
      return `${yy}${mm}${dd}`;
  }
}

function segmentDisplayToken(segment: SequenceFormatSegment): string {
  switch (segment.segment_type) {
    case 'date_format':
      return segment.date_format ?? 'YYMMDD';
    case 'sequence':
      return 'X'.repeat(segment.sequence_digits ?? 7);
    case 'tenant_code':
      return 'TTTTT';
    case 'prefix_text':
      return segment.prefix_value?.trim() || 'PREFIX';
    default:
      return segment.segment_type;
  }
}

function segmentPreviewValue(
  segment: SequenceFormatSegment,
  tenantNumericCode: string,
  asOfDate: Date,
  sampleSequence: number,
): string {
  switch (segment.segment_type) {
    case 'date_format':
      return formatDateSegment(asOfDate, segment.date_format ?? 'YYMMDD');
    case 'sequence': {
      const digits = segment.sequence_digits ?? 7;
      return String(sampleSequence).padStart(digits, '0');
    }
    case 'tenant_code':
      return tenantNumericCode;
    case 'prefix_text':
      return segment.prefix_value?.trim() ?? '';
    default:
      return '';
  }
}

export function normalizeTenantNumericCode(code: string | null | undefined): string {
  const digits = String(code ?? '').replace(/\D/g, '');
  if (!digits) return '00001';
  return digits.slice(-5).padStart(5, '0');
}

export function buildFormatCode(segments: SequenceFormatSegment[]): string {
  return enabledSegments(segments)
    .map(segmentDisplayToken)
    .join(' - ');
}

export function buildFormatPreview(
  segments: SequenceFormatSegment[],
  tenantNumericCode: string,
  asOfDate = new Date(),
  sampleSequence = 1,
): string {
  return enabledSegments(segments)
    .map((s) => segmentPreviewValue(s, tenantNumericCode, asOfDate, sampleSequence))
    .join('');
}

export function normalizeSegmentOrder(segments: SequenceFormatSegment[]): SequenceFormatSegment[] {
  return [...segments]
    .sort((a, b) => a.order_index - b.order_index)
    .map((segment, index) => ({ ...segment, order_index: index }));
}

/** Reorders segment cards by position; does not sort by stale order_index after a swap. */
export function moveSegmentInOrder(
  segments: SequenceFormatSegment[],
  segmentType: SegmentType,
  direction: -1 | 1,
): SequenceFormatSegment[] {
  const ordered = normalizeSegmentOrder(segments);
  const idx = ordered.findIndex((s) => s.segment_type === segmentType);
  const target = idx + direction;
  if (idx < 0 || target < 0 || target >= ordered.length) {
    return ordered;
  }
  const next = [...ordered];
  const a = next[idx];
  const b = next[target];
  if (!a || !b) return ordered;
  next[idx] = b;
  next[target] = a;
  return next.map((segment, index) => ({ ...segment, order_index: index }));
}

export function prefixFromFormatCode(formatCode: string): string {
  const token = formatCode.split(' - ')[0]?.trim() ?? '';
  if (!token || token === 'PREFIX' || token.includes('X') || token === 'TTTTT') {
    return '—';
  }
  if (DATE_FORMATS.includes(token as DateFormat)) return '—';
  return token;
}

export function formatPreviewExampleNote(
  tenantNumericCode: string,
  asOfDate = new Date(),
): string {
  const d = asOfDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  return `example · tenant ${tenantNumericCode} · ${d}`;
}
