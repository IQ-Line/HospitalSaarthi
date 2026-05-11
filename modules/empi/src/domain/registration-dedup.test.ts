import { describe, expect, it } from "vitest";
import {
  agesWithinTwoYears,
  estimateAgeYears,
  fullNamesPhoneticallySimilar,
  generatePhoneticKey,
  isPhoneticallySimilar,
  stripSalutationPrefixFromFullName,
} from "./registration-dedup.js";

describe("registration-dedup helpers", () => {
  it("isPhoneticallySimilar treats common transliteration / single-char swaps", () => {
    expect(isPhoneticallySimilar("john", "jon")).toBe(true);
    expect(isPhoneticallySimilar("smith", "smyth")).toBe(true);
  });

  it("generatePhoneticKey is stable for comparable names", () => {
    const k1 = generatePhoneticKey("john");
    const k2 = generatePhoneticKey("jane");
    expect(k1.length).toBeGreaterThan(0);
    expect(k2.length).toBeGreaterThan(0);
  });

  it("fullNamesPhoneticallySimilar uses legacy pipeline (whole + first/last)", () => {
    expect(
      fullNamesPhoneticallySimilar("John Smith", "Jon Smyth"),
    ).toBe(true);
    expect(
      fullNamesPhoneticallySimilar("John Smith", "Jane Doe"),
    ).toBe(false);
  });

  it("stripSalutationPrefixFromFullName matches legacy removePrefix behavior", () => {
    expect(stripSalutationPrefixFromFullName("Mr John Smith")).toBe("John Smith");
    expect(stripSalutationPrefixFromFullName("Dr. Jane Doe")).toBe("Jane Doe");
    expect(stripSalutationPrefixFromFullName("John Smith")).toBe("John Smith");
  });

  it("fullNamesPhoneticallySimilar strips salutation then matches", () => {
    expect(
      fullNamesPhoneticallySimilar("Mr John Smith", "John Smith"),
    ).toBe(true);
    expect(
      fullNamesPhoneticallySimilar("Dr. Jon Smyth", "John Smith"),
    ).toBe(true);
  });

  it("fullNamesPhoneticallySimilar allows bidirectional substring when both names are long enough", () => {
    expect(
      fullNamesPhoneticallySimilar(
        "Laksh Chaudhary",
        "Laksh Deep Chaudhary",
      ),
    ).toBe(true);
  });

  it("Yashi Sarm vs Yuio Sarm: whole-name phonetic score can exceed threshold (same phone+gender+age → 409)", () => {
    expect(fullNamesPhoneticallySimilar("Yashi Sarm", "Yuio Sarm")).toBe(true);
  });

  it("agesWithinTwoYears requires both sides to have age and ±2 window", () => {
    const ref = new Date("2020-06-15T12:00:00.000Z");
    expect(
      agesWithinTwoYears(
        { date_of_birth: "1990-01-01", year_of_birth: null, age_years: null },
        { date_of_birth: "1991-06-01", year_of_birth: null, age_years: null },
        ref,
      ),
    ).toBe(true);
    expect(
      agesWithinTwoYears(
        { date_of_birth: "1990-01-01", year_of_birth: null, age_years: null },
        { date_of_birth: "1985-01-01", year_of_birth: null, age_years: null },
        ref,
      ),
    ).toBe(false);
    expect(
      agesWithinTwoYears(
        { date_of_birth: null, year_of_birth: null, age_years: null },
        { date_of_birth: "1990-01-01", year_of_birth: null, age_years: null },
        ref,
      ),
    ).toBe(false);
  });

  it("estimateAgeYears uses age_years then year_of_birth then DOB", () => {
    const ref = new Date("2020-06-15T12:00:00.000Z");
    expect(
      estimateAgeYears(
        { age_years: 25, year_of_birth: 1990, date_of_birth: "1994-01-01" },
        ref,
      ),
    ).toBe(25);
    expect(
      estimateAgeYears(
        { age_years: null, year_of_birth: 1990, date_of_birth: null },
        ref,
      ),
    ).toBe(30);
  });
});
