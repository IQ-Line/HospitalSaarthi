import { describe, expect, it } from "vitest";
import {
  isRegistrationDocumentEligible,
  mergeIntakeIntoSnapshot,
  parseRegistrationStatus,
  registrationStatusFromIntakeCompletion,
  REGISTRATION_STATUS_CANCELLED,
  REGISTRATION_STATUS_COMPLETED,
  REGISTRATION_STATUS_IN_PROGRESS,
  REGISTRATION_STATUS_PENDING,
  stripNonEmpiIntakeFields,
  yearOfBirthFromIntake,
} from "./registration-helpers.js";

describe("registration status", () => {
  it("maps intake completion to initial status", () => {
    expect(registrationStatusFromIntakeCompletion("pending")).toBe(
      REGISTRATION_STATUS_PENDING,
    );
    expect(registrationStatusFromIntakeCompletion("partial")).toBe(
      REGISTRATION_STATUS_IN_PROGRESS,
    );
    expect(registrationStatusFromIntakeCompletion("complete")).toBe(
      REGISTRATION_STATUS_COMPLETED,
    );
  });

  it("parses valid status", () => {
    expect(parseRegistrationStatus("in_progress")).toBe("in_progress");
  });

  it("rejects unknown status", () => {
    expect(() => parseRegistrationStatus("routed")).toThrow("invalid_registration_status");
  });

  it("allows desk documents for active registration statuses", () => {
    expect(isRegistrationDocumentEligible(REGISTRATION_STATUS_PENDING)).toBe(true);
    expect(isRegistrationDocumentEligible(REGISTRATION_STATUS_IN_PROGRESS)).toBe(true);
    expect(isRegistrationDocumentEligible(REGISTRATION_STATUS_COMPLETED)).toBe(true);
    expect(isRegistrationDocumentEligible(REGISTRATION_STATUS_CANCELLED)).toBe(false);
  });
});

describe("intake snapshot merge", () => {
  it("stores desk ABHA address and year of birth on the registration snapshot", () => {
    const merged = mergeIntakeIntoSnapshot(
      {
        uhid: "UHID-1",
        full_name: "Yashi Verma",
        phone_number: "+919876543210",
        abha_number: "91-5682-4304-3771",
        abha_address: null,
        year_of_birth: null,
      },
      {
        abha_address: "yashiverma200111@sbx",
        date_of_birth: "2000-11-11",
      },
    );
    expect(merged.abha_address).toBe("yashiverma200111@sbx");
    expect(merged.year_of_birth).toBe(2000);
  });

  it("strips abha_address before EMPI create", () => {
    expect(
      stripNonEmpiIntakeFields({
        first_name: "Yashi",
        abha_address: "yashi@sbx",
        abha_number: "91-1",
      }),
    ).toEqual({ first_name: "Yashi", abha_number: "91-1" });
  });

  it("derives year of birth from date_of_birth", () => {
    expect(yearOfBirthFromIntake({ date_of_birth: "1998-05-20" })).toBe(1998);
  });
});
