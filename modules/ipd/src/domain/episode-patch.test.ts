import { describe, expect, it } from "vitest";
import type { Episode } from "./episode.js";
import {
  assertEpisodeEditable,
  isEditableEpisodeStatus,
  pickAllowedEpisodePatch,
} from "./episode-patch.js";

const baseEpisode = (): Episode => ({
  id: "a-1",
  iq_tenant_id: "t-1",
  episode_number: "IPD-20260608-0001",
  visit_id: null,
  patient_id: "p-1",
  patient_name: "Test Patient",
  admission_type: "planned",
  admission_source: "walk_in",
  status: "scheduled",
  ward_id: null,
  bed_id: null,
  specialty_id: null,
  attending_consultant_id: null,
  provisional_diagnosis: null,
  financial_class: "general",
  deposit_amount: null,
  expected_los_days: null,
  admitted_at: null,
  discharged_at: null,
  closure_type: null,
  closure_reason: null,
  idempotency_key: null,
  created_at: "2026-06-08T00:00:00.000Z",
  updated_at: "2026-06-08T00:00:00.000Z",
});

describe("pickAllowedEpisodePatch", () => {
  it("keeps only allowlisted fields", () => {
    const patch = pickAllowedEpisodePatch({
      provisional_diagnosis: "Fever",
      patient_id: "evil",
      status: "discharged",
      episode_number: "HACK",
    });
    expect(patch).toEqual({ provisional_diagnosis: "Fever" });
  });
});

describe("assertEpisodeEditable", () => {
  it("allows scheduled", () => {
    expect(isEditableEpisodeStatus("scheduled")).toBe(true);
    expect(() => assertEpisodeEditable({ ...baseEpisode(), status: "scheduled" })).not.toThrow();
  });

  it("rejects admitted and terminal statuses", () => {
    expect(() =>
      assertEpisodeEditable({ ...baseEpisode(), status: "admitted" }),
    ).toThrow(/Cannot edit episode/);
    expect(() =>
      assertEpisodeEditable({ ...baseEpisode(), status: "discharged" }),
    ).toThrow(/Cannot edit episode/);
  });
});
