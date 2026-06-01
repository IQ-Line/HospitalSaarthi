import { describe, expect, it } from "vitest";
import { buildConsultationServiceCode } from "./consultation-service-code.js";

describe("buildConsultationServiceCode", () => {
  it("builds CONSULT_TYPE_DEPARTMENT pattern", () => {
    expect(buildConsultationServiceCode("GENERAL_CONSULTATION", "cardiology")).toBe(
      "CONSULT_GENERAL_CONSULTATION_CARDIOLOGY",
    );
  });

  it("sanitizes unsafe characters", () => {
    expect(buildConsultationServiceCode("follow-up", "OPD / Main")).toBe(
      "CONSULT_FOLLOW_UP_OPD_MAIN",
    );
  });
});
