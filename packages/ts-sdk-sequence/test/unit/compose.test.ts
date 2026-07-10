import { describe, expect, it } from "vitest";
import {
  buildCounterKey,
  buildFormatCode,
  composeIdentifier,
  resolveDefaultIdentifier,
  resolveEffectiveIdentifier,
} from "../../src/compose.js";

describe("ts-sdk-sequence compose", () => {
  it("builds default patient UHID preview", () => {
    const defaults = resolveDefaultIdentifier("patient_uhid");
    expect(buildFormatCode(defaults.segments)).toBe("YYMMDD - TTTTT - XXXXXXX");
    expect(
      composeIdentifier(
        defaults.segments,
        "00003",
        new Date(Date.UTC(2026, 2, 27)),
        1,
      ),
    ).toBe("260327000030000001");
  });

  it("builds OP visit preview with trailing prefix", () => {
    const effective = resolveEffectiveIdentifier("op_visit", undefined);
    expect(
      composeIdentifier(
        effective.segments,
        "00003",
        new Date(Date.UTC(2026, 2, 27)),
        1,
      ),
    ).toBe("OP2603270000001");
  });

  it("builds counter key with date partition when date segment enabled", () => {
    const effective = resolveDefaultIdentifier("op_bill");
    expect(
      buildCounterKey(
        "op_bill",
        effective.segments,
        new Date(Date.UTC(2026, 5, 2)),
      ),
    ).toBe("op_bill:260602");
  });
});
