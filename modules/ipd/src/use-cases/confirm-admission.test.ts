import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import { InMemoryBedRepo } from "../data-access/bed.repo.js";
import { InMemoryEpisodeRepo } from "../data-access/episode.repo.js";
import type { Episode } from "../domain/episode.js";
import { IPD_EVENT_EPISODE_ADMITTED } from "../events/publish-episode-admitted.js";
import { confirmAdmission, ConfirmAdmissionError } from "./confirm-admission.js";

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

function mockEventBus(): EventBus {
  return { publish: vi.fn().mockResolvedValue(undefined) } as unknown as EventBus;
}

describe("confirmAdmission", () => {
  it("transitions scheduled episode to admitted and publishes event", async () => {
    const episodeRepo = new InMemoryEpisodeRepo();
    const bedRepo = new InMemoryBedRepo();
    const eventBus = mockEventBus();
    await episodeRepo.insert(scheduledEpisode());
    await bedRepo.reserveForEpisode("tenant-1", "bed-1", "ep-1");

    const result = await confirmAdmission(
      { episodeRepo, bedRepo, eventBus },
      "tenant-1",
      "ep-1",
      "actor-1",
    );

    expect(result?.status).toBe("admitted");
    expect(result?.admitted_at).toBeTruthy();

    const bed = await bedRepo.getById("tenant-1", "bed-1");
    expect(bed?.bed_status).toBe("occupied");
    expect(bed?.current_episode_id).toBe("ep-1");

    expect(eventBus.publish).toHaveBeenCalledOnce();
    const envelope = vi.mocked(eventBus.publish).mock.calls[0]![0];
    expect(envelope.event_type).toBe(IPD_EVENT_EPISODE_ADMITTED);
  });

  it("requires bed assignment", async () => {
    const episodeRepo = new InMemoryEpisodeRepo();
    await episodeRepo.insert(scheduledEpisode({ bed_id: null }));

    await expect(
      confirmAdmission(
        { episodeRepo, bedRepo: new InMemoryBedRepo(), eventBus: mockEventBus() },
        "tenant-1",
        "ep-1",
      ),
    ).rejects.toThrow(ConfirmAdmissionError);
  });

  it("rejects non-scheduled episodes", async () => {
    const episodeRepo = new InMemoryEpisodeRepo();
    await episodeRepo.insert(scheduledEpisode({ status: "admitted", admitted_at: "2026-06-08T11:00:00.000Z" }));

    await expect(
      confirmAdmission(
        { episodeRepo, bedRepo: new InMemoryBedRepo(), eventBus: mockEventBus() },
        "tenant-1",
        "ep-1",
      ),
    ).rejects.toThrow(/scheduled/);
  });

  it("rejects when bed is reserved for another episode", async () => {
    const episodeRepo = new InMemoryEpisodeRepo();
    const bedRepo = new InMemoryBedRepo();
    await episodeRepo.insert(scheduledEpisode());
    await bedRepo.reserveForEpisode("tenant-1", "bed-1", "other-ep");

    await expect(
      confirmAdmission(
        { episodeRepo, bedRepo, eventBus: mockEventBus() },
        "tenant-1",
        "ep-1",
      ),
    ).rejects.toThrow(ConfirmAdmissionError);
  });
});
