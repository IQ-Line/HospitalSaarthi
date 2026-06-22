import { describe, expect, it } from "vitest";
import {
  ALLOWED_PATIENT_STATUS_TRANSITIONS,
  isAllowedPatientStatusTransition,
} from "../../../src/domain/patient-status.js";

describe("patient status transitions", () => {
  it("deceased is terminal", () => {
    expect(isAllowedPatientStatusTransition("deceased", "active")).toBe(false);
    expect(isAllowedPatientStatusTransition("deceased", "inactive")).toBe(false);
    expect(ALLOWED_PATIENT_STATUS_TRANSITIONS.deceased.length).toBe(0);
  });

  it("allows active ↔ inactive and into deceased", () => {
    expect(isAllowedPatientStatusTransition("active", "inactive")).toBe(true);
    expect(isAllowedPatientStatusTransition("inactive", "active")).toBe(true);
    expect(isAllowedPatientStatusTransition("active", "deceased")).toBe(true);
    expect(isAllowedPatientStatusTransition("inactive", "deceased")).toBe(true);
  });

  it("idempotent same status", () => {
    expect(isAllowedPatientStatusTransition("active", "active")).toBe(true);
    expect(isAllowedPatientStatusTransition("deceased", "deceased")).toBe(true);
  });
});
