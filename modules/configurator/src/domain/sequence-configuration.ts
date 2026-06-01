import { ConfiguratorError } from "../errors.js";
import type { ProvisioningStatus } from "./tenant.types.js";

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

export type SequenceConfigStatus = "default" | "configured";

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

export interface SequenceConfiguration {
  iq_tenant_id: string;
  status: SequenceConfigStatus;
  configured_at: Date | null;
  identifier_overrides: IdentifierOverrides;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface IdentifierSummary {
  is_custom: boolean;
  format_code: string;
}

export interface SequenceConfigurationSummary {
  iq_tenant_id: string;
  tenant_name: string;
  tenant_numeric_code: string | null;
  provisioning_status: ProvisioningStatus;
  status: SequenceConfigStatus;
  custom_count: number;
  identifiers: Record<IdentifierType, IdentifierSummary>;
}

export interface SequenceConfigurationDetail {
  iq_tenant_id: string;
  tenant_name: string;
  tenant_numeric_code: string | null;
  status: SequenceConfigStatus;
  configured_at: string | null;
  identifiers: Array<{
    identifier_type: IdentifierType;
    is_custom: boolean;
    format_code: string;
    segments: SequenceFormatSegment[];
  }>;
}

export interface SequenceConfigurationFilters {
  org_id?: string;
  provisioning_status?: ProvisioningStatus;
  status?: SequenceConfigStatus;
  q?: string;
}

export interface UpsertIdentifierInput {
  is_custom: boolean;
  segments?: SequenceFormatSegment[];
}

const DEFAULT_PREFIX: Partial<Record<IdentifierType, string>> = {
  op_visit: "OP",
  ip_visit: "IP",
  emergency_visit: "EM",
  op_bill: "OPB",
  ip_bill: "IPB",
  emergency_bill: "ERB",
};

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

function normalizeSegmentOrder(segments: SequenceFormatSegment[]): SequenceFormatSegment[] {
  return [...segments]
    .sort((a, b) => a.order_index - b.order_index)
    .map((segment, index) => ({ ...segment, order_index: index }));
}

export function normalizeTenantNumericCode(code: string | null | undefined): string {
  const digits = String(code ?? "").replace(/\D/g, "");
  if (!digits) return "00001";
  return digits.slice(-5).padStart(5, "0");
}

function formatDateSegment(date: Date, format: DateFormat): string {
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
      throw new ConfiguratorError(400, `Unsupported date format: ${format}`, "VALIDATION_ERROR");
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

function segmentPreviewValue(
  segment: SequenceFormatSegment,
  tenantNumericCode: string,
  asOfDate: Date,
  sampleSequence: number,
): string {
  switch (segment.segment_type) {
    case "date_format":
      return formatDateSegment(asOfDate, segment.date_format ?? "YYMMDD");
    case "sequence": {
      const digits = segment.sequence_digits ?? 7;
      return String(sampleSequence).padStart(digits, "0");
    }
    case "tenant_code":
      return tenantNumericCode;
    case "prefix_text":
      return segment.prefix_value?.trim() ?? "";
    default:
      return "";
  }
}

export function buildFormatCode(segments: SequenceFormatSegment[]): string {
  return enabledSegments(segments)
    .map(segmentDisplayToken)
    .join(" - ");
}

export function buildFormatPreview(
  segments: SequenceFormatSegment[],
  tenantNumericCode: string,
  asOfDate: Date,
  sampleSequence = 1,
): string {
  return enabledSegments(segments)
    .map((segment) => segmentPreviewValue(segment, tenantNumericCode, asOfDate, sampleSequence))
    .join("");
}

function enabledSegments(segments: SequenceFormatSegment[]): SequenceFormatSegment[] {
  return [...segments]
    .filter((segment) => segment.enabled)
    .sort((a, b) => a.order_index - b.order_index);
}

export function resolveDefaultIdentifier(
  identifierType: IdentifierType,
): IdentifierOverride {
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

export function buildIdentifierSummaries(
  overrides: IdentifierOverrides | null | undefined,
): Record<IdentifierType, IdentifierSummary> {
  return Object.fromEntries(
    IDENTIFIER_TYPES.map((identifierType) => {
      const effective = resolveEffectiveIdentifier(identifierType, overrides);
      return [
        identifierType,
        {
          is_custom: Boolean(overrides?.[identifierType]?.is_custom),
          format_code: effective.format_code,
        },
      ];
    }),
  ) as Record<IdentifierType, IdentifierSummary>;
}

export function deriveConfigurationStatus(
  overrides: IdentifierOverrides,
): SequenceConfigStatus {
  return Object.values(overrides).some((entry) => entry.is_custom)
    ? "configured"
    : "default";
}

export function countCustomIdentifiers(overrides: IdentifierOverrides | null | undefined): number {
  if (!overrides) return 0;
  return Object.values(overrides).filter((entry) => entry.is_custom).length;
}

export function validateIdentifierType(value: string): IdentifierType {
  if ((IDENTIFIER_TYPES as readonly string[]).includes(value)) {
    return value as IdentifierType;
  }
  throw new ConfiguratorError(400, `Unknown identifier type: ${value}`, "VALIDATION_ERROR");
}

export function validateAndBuildOverride(
  identifierType: IdentifierType,
  input: UpsertIdentifierInput,
  tenantNumericCode: string,
): IdentifierOverride {
  if (!input.segments?.length) {
    throw new ConfiguratorError(400, "segments are required when is_custom is true", "VALIDATION_ERROR");
  }

  const segments = normalizeSegmentOrder(input.segments);
  validateSegments(segments);

  const format_code = buildFormatCode(segments);
  buildFormatPreview(segments, tenantNumericCode, new Date());

  return { is_custom: true, format_code, segments };
}

export function validateSegments(segments: SequenceFormatSegment[]): void {
  const enabled = enabledSegments(segments);
  if (enabled.length === 0) {
    throw new ConfiguratorError(400, "At least one segment must be enabled", "VALIDATION_ERROR");
  }

  const hasSequence = enabled.some((segment) => segment.segment_type === "sequence");
  if (!hasSequence) {
    throw new ConfiguratorError(400, "Sequence segment must be enabled", "VALIDATION_ERROR");
  }

  const orderIndexes = new Set<number>();
  for (const segment of segments) {
    if (!(SEGMENT_TYPES as readonly string[]).includes(segment.segment_type)) {
      throw new ConfiguratorError(
        400,
        `Unknown segment type: ${segment.segment_type}`,
        "VALIDATION_ERROR",
      );
    }
    if (!Number.isInteger(segment.order_index) || segment.order_index < 0) {
      throw new ConfiguratorError(400, "Invalid segment order_index", "VALIDATION_ERROR");
    }
    if (segment.enabled) {
      if (orderIndexes.has(segment.order_index)) {
        throw new ConfiguratorError(400, "Duplicate segment order_index", "VALIDATION_ERROR");
      }
      orderIndexes.add(segment.order_index);
    }

    if (segment.segment_type === "date_format" && segment.enabled) {
      if (!segment.date_format || !(DATE_FORMATS as readonly string[]).includes(segment.date_format)) {
        throw new ConfiguratorError(400, "Invalid date_format", "VALIDATION_ERROR");
      }
    }

    if (segment.segment_type === "sequence" && segment.enabled) {
      const digits = segment.sequence_digits ?? 0;
      const startsAt = segment.sequence_starts_at ?? 0;
      if (!Number.isInteger(digits) || digits < 1 || digits > 12) {
        throw new ConfiguratorError(400, "sequence_digits must be between 1 and 12", "VALIDATION_ERROR");
      }
      if (!Number.isInteger(startsAt) || startsAt < 1) {
        throw new ConfiguratorError(400, "sequence_starts_at must be at least 1", "VALIDATION_ERROR");
      }
    }

    if (segment.segment_type === "prefix_text" && segment.enabled) {
      const prefix = segment.prefix_value?.trim();
      if (!prefix) {
        throw new ConfiguratorError(400, "prefix_value is required when prefix segment is enabled", "VALIDATION_ERROR");
      }
    }
  }
}

export function buildConfigurationDetail(
  tenant: {
    iq_tenant_id: string;
    name: string;
    tenant_numeric_code: string | null;
  },
  row: SequenceConfiguration | null | undefined,
): SequenceConfigurationDetail {
  const overrides = row?.identifier_overrides ?? {};
  return {
    iq_tenant_id: tenant.iq_tenant_id,
    tenant_name: tenant.name,
    tenant_numeric_code: tenant.tenant_numeric_code,
    status: row?.status ?? "default",
    configured_at: row?.configured_at?.toISOString() ?? null,
    identifiers: IDENTIFIER_TYPES.map((identifierType) => {
      const effective = resolveEffectiveIdentifier(identifierType, overrides);
      return {
        identifier_type: identifierType,
        is_custom: Boolean(overrides[identifierType]?.is_custom),
        format_code: effective.format_code,
        segments: effective.segments,
      };
    }),
  };
}
