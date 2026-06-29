import { describe, expect, it } from "vitest";
import {
  buildEmpiDemographicsFromDiscovery,
  normalizeDiscoveryPatient,
  resolveDiscoveryAbhaAddress,
} from "./normalize-discovery-patient.js";

describe("normalizeDiscoveryPatient", () => {
  it("reads ABHA address from object-shaped patient (ABDM §5.3.2)", () => {
    const patient = normalizeDiscoveryPatient({
      id: "yashiverma200111@sbx",
      verifiedIdentifiers: [{ type: "MOBILE", value: "9876543210" }],
      name: "Yashi Verma",
      gender: "F",
      yearOfBirth: 2001,
    });
    expect(patient?.id).toBe("yashiverma200111@sbx");
    expect(resolveDiscoveryAbhaAddress(patient)).toBe("yashiverma200111@sbx");
  });

  it("supports legacy array-shaped patient payloads", () => {
    const patient = normalizeDiscoveryPatient([
      { id: "user@sbx", name: "User", gender: "M", yearOfBirth: 1990 },
    ]);
    expect(resolveDiscoveryAbhaAddress(patient)).toBe("user@sbx");
  });

  it("falls back to unverified ABHA_ADDRESS identifier", () => {
    const patient = normalizeDiscoveryPatient({
      unverifiedIdentifiers: [{ type: "ABHA_ADDRESS", value: "shaik.test@sbx" }],
      name: "Shaik",
      gender: "M",
      yearOfBirth: 1995,
    });
    expect(resolveDiscoveryAbhaAddress(patient)).toBe("shaik.test@sbx");
  });

  it("builds EMPI demographics from discover patient block", () => {
    const demographics = buildEmpiDemographicsFromDiscovery(
      normalizeDiscoveryPatient({
        id: "user@sbx",
        verifiedIdentifiers: [{ type: "MOBILE", value: "9876543210" }],
        name: "Yashi Verma",
        gender: "F",
        yearOfBirth: 2001,
      }),
    );
    expect(demographics).toEqual({
      first_name: "Yashi",
      gender: "female",
      phone_number: "9876543210",
      year_of_birth: 2001,
    });
  });
});
