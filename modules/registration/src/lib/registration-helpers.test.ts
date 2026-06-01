import { describe, expect, it } from "vitest";
import {
  isRegistrationDocumentEligible,
  parseRegistrationStatus,
  registrationStatusFromIntakeCompletion,
  REGISTRATION_STATUS_CANCELLED,
  REGISTRATION_STATUS_COMPLETED,
  REGISTRATION_STATUS_IN_PROGRESS,
  REGISTRATION_STATUS_PENDING,
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
