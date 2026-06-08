export const IDENTIFIER_TYPES = [
  "patient_uhid",
  "op_visit",
  "ip_visit",
  "emergency_visit",
  "op_bill",
  "ip_bill",
  "emergency_bill",
] as const;

export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export const SEGMENT_TYPES = [
  "date_format",
  "sequence",
  "tenant_code",
  "prefix_text",
] as const;

export type SegmentType = (typeof SEGMENT_TYPES)[number];

export const DATE_FORMATS = ["YYMMDD", "YYYYMMDD", "MMDDYY", "DDMMYY"] as const;
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

export interface IdentifierOverride {
  is_custom: boolean;
  format_code: string;
  segments: SequenceFormatSegment[];
}

export type IdentifierOverrides = Partial<Record<IdentifierType, IdentifierOverride>>;
