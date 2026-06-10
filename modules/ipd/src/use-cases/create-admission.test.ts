import { describe, expect, it } from "vitest";
import { InMemoryBedRepo } from "../data-access/bed.repo.js";
import { InMemoryEpisodeRepo } from "../data-access/episode.repo.js";
import { createAdmission } from "./create-admission.js";

describe("createAdmission", () => {
  it("reserves bed before inserting episode", async () => {
    const episodeRepo = new InMemoryEpisodeRepo();
    const bedRepo = new InMemoryBedRepo();

    const created = await createAdmission(
      { episodeRepo, bedRepo },
      "tenant-1",
      {
        admission_source: "walk_in",
        admission_type: "planned",
        patient_id: "patient-1",
        patient_name: "Test Patient",
        bed_id: "bed-1",
      },
      null,
    );

    expect(created.status).toBe("scheduled");
    expect(created.bed_id).toBe("bed-1");

    const bed = await bedRepo.getById("tenant-1", "bed-1");
    expect(bed?.bed_status).toBe("reserved");
    expect(bed?.reserved_for_episode_id).toBe(created.id);
  });

  it("throws when bed is not available", async () => {
    const episodeRepo = new InMemoryEpisodeRepo();
    const bedRepo = new InMemoryBedRepo();
    await bedRepo.reserveForEpisode("tenant-1", "bed-1", "other-ep");

    await expect(
      createAdmission(
        { episodeRepo, bedRepo },
        "tenant-1",
        {
          admission_source: "walk_in",
          admission_type: "planned",
          patient_id: "patient-1",
          patient_name: "Test Patient",
          bed_id: "bed-1",
        },
        null,
      ),
    ).rejects.toThrow(/not available/);

    const episodes = await episodeRepo.list("tenant-1", { page: 1, limit: 10 });
    expect(episodes.data).toHaveLength(0);
  });
});
