import { describe, expect, it } from "vitest";
import {
  composeUhid,
  isValidUhidFormat,
  parseUhid,
  UHID_TOTAL_LENGTH,
} from "./uhid.js";

describe("UHID format", () => {
  it("composeUhid builds 18-digit id: YYMMDD + TTTTT + sequence", () => {
    const uhid = composeUhid("260507", "00001", 42);
    expect(uhid).toBe("260507000010000042");
    expect(uhid.length).toBe(UHID_TOTAL_LENGTH);
    expect(isValidUhidFormat(uhid)).toBe(true);
  });

  it("parseUhid splits segments", () => {
    const uhid = "260507123450000042";
    expect(parseUhid(uhid)).toEqual({
      dateSegment: "260507",
      tenantNumericCode: "12345",
      sequence: "0000042",
    });
  });

  it("rejects wrong length or non-numeric", () => {
    expect(isValidUhidFormat("260507")).toBe(false);
    expect(parseUhid("2605070000100000x")).toBe(null);
  });

  it("composeUhid rejects bad date segment", () => {
    expect(() => composeUhid("26050", "00001", 1)).toThrow();
  });
});
