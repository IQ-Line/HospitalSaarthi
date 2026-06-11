import { describe, expect, it } from "vitest";
import {
  computeVisitTypeDecision,
  DEFAULT_FREE_FOLLOW_UP_DAYS,
  DEFAULT_FREE_FOLLOW_UP_VISITS,
  normalizeFollowUpConfig,
  VISIT_TYPE_FIRST,
  VISIT_TYPE_FOLLOW_UP,
  VISIT_TYPE_FREE_FOLLOW_UP,
} from "./follow-up.js";

describe("computeVisitTypeDecision", () => {
  const config = normalizeFollowUpConfig(DEFAULT_FREE_FOLLOW_UP_DAYS, DEFAULT_FREE_FOLLOW_UP_VISITS);

  it("returns first visit when no prior visit in department", () => {
    const result = computeVisitTypeDecision(config, "patient-1", null, 0);
    expect(result.consultation_type).toBe("new");
    expect(result.visit_type_code).toBe(VISIT_TYPE_FIRST);
    expect(result.fee).toBe(1);
  });

  it("returns free follow-up within window with quota", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);
    const result = computeVisitTypeDecision(config, "patient-1", recent, 0);
    expect(result.consultation_type).toBe("free-followup");
    expect(result.visit_type_code).toBe(VISIT_TYPE_FREE_FOLLOW_UP);
    expect(result.fee).toBe(0);
    expect(result.valid_till).toBeTruthy();
  });

  it("returns paid follow-up when quota exhausted", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);
    const result = computeVisitTypeDecision(config, "patient-1", recent, 1);
    expect(result.consultation_type).toBe("followup");
    expect(result.visit_type_code).toBe(VISIT_TYPE_FOLLOW_UP);
    expect(result.fee).toBe(1);
  });

  it("returns paid follow-up after window", () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    const result = computeVisitTypeDecision(config, "patient-1", old, 0);
    expect(result.consultation_type).toBe("followup");
    expect(result.visit_type_code).toBe(VISIT_TYPE_FOLLOW_UP);
  });
});
