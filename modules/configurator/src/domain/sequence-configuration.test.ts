import { describe, expect, it } from "vitest";
import {
  buildFormatCode,
  buildFormatPreview,
  buildIdentifierSummaries,
  deriveConfigurationStatus,
  normalizeTenantNumericCode,
  resolveDefaultIdentifier,
  validateAndBuildOverride,
  validateSegments,
} from "./sequence-configuration.js";

describe("sequence-configuration", () => {
  it("normalizes tenant numeric code to five digits", () => {
    expect(normalizeTenantNumericCode("3")).toBe("00003");
    expect(normalizeTenantNumericCode("123456")).toBe("23456");
  });

  it("builds default patient UHID preview without delimiters", () => {
    const defaults = resolveDefaultIdentifier("patient_uhid");
    expect(buildFormatCode(defaults.segments)).toBe("YYMMDD - TTTTT - XXXXXXX");
    expect(
      buildFormatPreview(
        defaults.segments,
        "00003",
        new Date(Date.UTC(2026, 2, 27)),
      ),
    ).toBe("260327000030000001");
  });

  it("builds OP visit preview with trailing prefix", () => {
    const segments = [
      {
        segment_type: "date_format" as const,
        enabled: true,
        order_index: 0,
        date_format: "YYMMDD" as const,
      },
      {
        segment_type: "sequence" as const,
        enabled: true,
        order_index: 1,
        sequence_digits: 7,
        sequence_starts_at: 1,
      },
      {
        segment_type: "prefix_text" as const,
        enabled: true,
        order_index: 2,
        prefix_value: "OP",
      },
      {
        segment_type: "tenant_code" as const,
        enabled: false,
        order_index: 3,
      },
    ];
    validateSegments(segments);

    expect(buildFormatCode(segments)).toBe("YYMMDD - XXXXXXX - OP");
    expect(
      buildFormatPreview(segments, "00003", new Date(Date.UTC(2026, 2, 27))),
    ).toBe("2603270000001OP");
  });

  it("exposes enabled prefix_value in list identifier summaries", () => {
    const summaries = buildIdentifierSummaries({
      op_visit: {
        is_custom: true,
        format_code: "XXXX - OPA - DDMMYY",
        segments: [
          {
            segment_type: "sequence",
            enabled: true,
            order_index: 0,
            sequence_digits: 4,
            sequence_starts_at: 1,
          },
          {
            segment_type: "prefix_text",
            enabled: true,
            order_index: 1,
            prefix_value: "OPA",
          },
          {
            segment_type: "date_format",
            enabled: true,
            order_index: 2,
            date_format: "DDMMYY",
          },
          { segment_type: "tenant_code", enabled: false, order_index: 3 },
        ],
      },
    });
    expect(summaries.op_visit.prefix_value).toBe("OPA");
    expect(summaries.patient_uhid.prefix_value).toBeNull();
  });

  it("derives configured status only when a custom override exists", () => {
    expect(deriveConfigurationStatus({})).toBe("default");
    expect(
      deriveConfigurationStatus({
        op_visit: {
          is_custom: true,
          format_code: "OP - YYMMDD - XXXXXXX",
          segments: resolveDefaultIdentifier("op_visit").segments,
        },
      }),
    ).toBe("configured");
  });

  it("requires segments when is_custom is true", () => {
    expect(() =>
      validateAndBuildOverride("op_visit", { is_custom: true, segments: [] }, "00003"),
    ).toThrow("segments are required");
  });
});
