import type { EventBus } from "@hims/ts-sdk-events";
import type { Episode } from "../domain/episode.js";
import { publishEpisodeAdmitted } from "../events/publish-episode-admitted.js";
import type { BedRepo, EpisodeRepo } from "../ports.js";

export class ConfirmAdmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfirmAdmissionError";
  }
}

type ConfirmAdmissionDeps = {
  episodeRepo: EpisodeRepo;
  bedRepo: BedRepo;
  eventBus: EventBus;
};

export async function confirmAdmission(
  deps: ConfirmAdmissionDeps,
  tenantId: string,
  episodeId: string,
  actorId?: string | null,
): Promise<Episode | null> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;

  if (episode.status !== "scheduled") {
    throw new ConfirmAdmissionError("Episode must be scheduled to confirm admission");
  }
  if (!episode.bed_id) {
    throw new ConfirmAdmissionError("Bed must be assigned before confirming admission");
  }

  const bed = await deps.bedRepo.occupyForEpisode(
    tenantId,
    episode.bed_id,
    episode.id,
    episode.patient_id,
  );
  if (!bed) {
    throw new ConfirmAdmissionError("Bed is not available for this admission");
  }

  const admittedAt = new Date().toISOString();
  const updated = await deps.episodeRepo.transitionToAdmitted(tenantId, episodeId, admittedAt);
  if (!updated) {
    throw new ConfirmAdmissionError("Failed to confirm admission");
  }

  await publishEpisodeAdmitted({ eventBus: deps.eventBus }, updated, actorId);
  return updated;
}
