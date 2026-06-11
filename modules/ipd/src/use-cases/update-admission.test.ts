import { describe, expect, it } from "vitest";
import { InMemoryBedRepo } from "../data-access/bed.repo.js";
import { InMemoryEpisodeRepo } from "../data-access/episode.repo.js";
import type { Episode } from "../domain/episode.js";
import { updateAdmission } from "./update-admission.js";

function scheduledEpisode(overrides: Partial<Episode> = {}): Episode {
  const ts = "2026-06-08T10:00:00.000Z";
  return {
    id: "ep-1",
    iq_tenant_id: "tenant-1",
    episode_number: "IPD-20260608-0001",
    visit_id: null,
    patient_id: "patient-1",
    patient_name: "Test Patient",
    admission_type: "planned",
    admission_source: "walk_in",
    status: "scheduled",
    ward_id: null,
    bed_id: "bed-1",
    specialty_id: null,
    attending_consultant_id: null,
    provisional_diagnosis: null,
    financial_class: "general",
    deposit_amount: null,
    expected_los_days: 3,
    admitted_at: null,
    discharged_at: null,
    closure_type: null,
    closure_reason: null,
    idempotency_key: null,
    created_at: ts,
    updated_at: ts,
    ...overrides,
  };
}

describe("updateAdmission bed reassignment", () => {
  it("releases old reservation and reserves new bed", async () => {
    const episodeRepo = new InMemoryEpisodeRepo();
    const bedRepo = new InMemoryBedRepo();
    await episodeRepo.insert(scheduledEpisode());
    await bedRepo.reserveForEpisode("tenant-1", "bed-1", "ep-1");

    const updated = await updateAdmission(
      { episodeRepo, bedRepo },
      "tenant-1",
      "ep-1",
      { bed_id: "bed-2" },
    );

    expect(updated?.bed_id).toBe("bed-2");

    const oldBed = await bedRepo.getById("tenant-1", "bed-1");
    expect(oldBed?.bed_status).toBe("available");

    const newBed = await bedRepo.getById("tenant-1", "bed-2");
    expect(newBed?.bed_status).toBe("reserved");
    expect(newBed?.reserved_for_episode_id).toBe("ep-1");
  });

  it("throws when new bed is unavailable", async () => {
    const episodeRepo = new InMemoryEpisodeRepo();
    const bedRepo = new InMemoryBedRepo();
    await episodeRepo.insert(scheduledEpisode());
    await bedRepo.reserveForEpisode("tenant-1", "bed-1", "ep-1");
    await bedRepo.reserveForEpisode("tenant-1", "bed-2", "other-ep");

    await expect(
      updateAdmission({ episodeRepo, bedRepo }, "tenant-1", "ep-1", { bed_id: "bed-2" }),
    ).rejects.toThrow(/not available/);
  });
});
