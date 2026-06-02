import type {
  DateFormat,
  IdentifierOverride,
  IdentifierOverrides,
  IdentifierType,
  SequenceFormatSegment,
} from "./types.js";

const DEFAULT_PREFIX: Partial<Record<IdentifierType, string>> = {
  op_visit: "OP",
  ip_visit: "IP",
  emergency_visit: "EM",
  op_bill: "OPB",
  ip_bill: "IPB",
  emergency_bill: "ERB",
};

function normalizeSegmentOrder(segments: SequenceFormatSegment[]): SequenceFormatSegment[] {
  return [...segments]
    .sort((a, b) => a.order_index - b.order_index)
    .map((segment, index) => ({ ...segment, order_index: index }));
}

function defaultSegments(identifierType: IdentifierType): SequenceFormatSegment[] {
  const prefix = DEFAULT_PREFIX[identifierType];
  const segments: SequenceFormatSegment[] = [
    {
      segment_type: "date_format",
      enabled: true,
      order_index: identifierType === "patient_uhid" ? 0 : prefix ? 1 : 0,
      date_format: "YYMMDD",
    },
    {
      segment_type: "sequence",
      enabled: true,
      order_index: identifierType === "patient_uhid" ? 2 : prefix ? 2 : 1,
      sequence_digits: 7,
      sequence_starts_at: 1,
    },
    {
      segment_type: "tenant_code",
      enabled: identifierType === "patient_uhid",
      order_index: identifierType === "patient_uhid" ? 1 : 3,
    },
    {
      segment_type: "prefix_text",
      enabled: Boolean(prefix),
      order_index: prefix ? 0 : 3,
      prefix_value: prefix ?? null,
    },
  ];
  return normalizeSegmentOrder(segments);
}

export function normalizeTenantNumericCode(code: string | null | undefined): string {
  const digits = String(code ?? "").replace(/\D/g, "");
  if (!digits) return "00001";
  return digits.slice(-5).padStart(5, "0");
}

export function formatDateSegment(date: Date, format: DateFormat): string {
  const yy = String(date.getFullYear()).slice(-2);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  switch (format) {
    case "YYMMDD":
      return `${yy}${mm}${dd}`;
    case "YYYYMMDD":
      return `${yyyy}${mm}${dd}`;
    case "MMDDYY":
      return `${mm}${dd}${yy}`;
    case "DDMMYY":
      return `${dd}${mm}${yy}`;
    default:
      throw new Error(`Unsupported date format: ${format}`);
  }
}

function segmentDisplayToken(segment: SequenceFormatSegment): string {
  switch (segment.segment_type) {
    case "date_format":
      return segment.date_format ?? "YYMMDD";
    case "sequence":
      return "X".repeat(segment.sequence_digits ?? 7);
    case "tenant_code":
      return "TTTTT";
    case "prefix_text":
      return segment.prefix_value?.trim() || "PREFIX";
    default:
      return segment.segment_type;
  }
}

function segmentValue(
  segment: SequenceFormatSegment,
  tenantNumericCode: string,
  asOfDate: Date,
  sequence: number,
): string {
  switch (segment.segment_type) {
    case "date_format":
      return formatDateSegment(asOfDate, segment.date_format ?? "YYMMDD");
    case "sequence": {
      const digits = segment.sequence_digits ?? 7;
      return String(sequence).padStart(digits, "0");
    }
    case "tenant_code":
      return tenantNumericCode;
    case "prefix_text":
      return segment.prefix_value?.trim() ?? "";
    default:
      return "";
  }
}

export function enabledSegments(segments: SequenceFormatSegment[]): SequenceFormatSegment[] {
  return [...segments]
    .filter((segment) => segment.enabled)
    .sort((a, b) => a.order_index - b.order_index);
}

export function buildFormatCode(segments: SequenceFormatSegment[]): string {
  return enabledSegments(segments)
    .map(segmentDisplayToken)
    .join(" - ");
}

export function composeIdentifier(
  segments: SequenceFormatSegment[],
  tenantNumericCode: string,
  asOfDate: Date,
  sequence: number,
): string {
  return enabledSegments(segments)
    .map((segment) => segmentValue(segment, tenantNumericCode, asOfDate, sequence))
    .join("");
}

/** Alias kept for configurator preview parity. */
export const buildFormatPreview = composeIdentifier;

export function resolveDefaultIdentifier(identifierType: IdentifierType): IdentifierOverride {
  const segments = defaultSegments(identifierType);
  return {
    is_custom: false,
    format_code: buildFormatCode(segments),
    segments,
  };
}

export function resolveEffectiveIdentifier(
  identifierType: IdentifierType,
  overrides: IdentifierOverrides | null | undefined,
): IdentifierOverride {
  const stored = overrides?.[identifierType];
  if (stored?.is_custom) {
    return stored;
  }
  return resolveDefaultIdentifier(identifierType);
}

export function buildCounterKey(
  identifierType: IdentifierType,
  segments: SequenceFormatSegment[],
  asOfDate: Date,
): string {
  const dateSegment = enabledSegments(segments).find(
    (segment) => segment.segment_type === "date_format",
  );
  if (dateSegment) {
    const datePart = formatDateSegment(asOfDate, dateSegment.date_format ?? "YYMMDD");
    return `${identifierType}:${datePart}`;
  }
  return `${identifierType}:global`;
}

export function sequenceStartsAt(segments: SequenceFormatSegment[]): number {
  const sequenceSegment = enabledSegments(segments).find(
    (segment) => segment.segment_type === "sequence",
  );
  return sequenceSegment?.sequence_starts_at ?? 1;
}
