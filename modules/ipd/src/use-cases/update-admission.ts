import type { Episode, EpisodePatch, EpisodeRepo } from "../domain/episode.js";
import {
  assertEpisodeEditable,
  normalizeEpisodePatch,
  pickAllowedEpisodePatch,
} from "../domain/episode-patch.js";
import type { BedRepo } from "../ports.js";

type UpdateAdmissionDeps = {
  episodeRepo: EpisodeRepo;
  bedRepo: BedRepo;
};

export async function updateAdmission(
  deps: UpdateAdmissionDeps,
  tenantId: string,
  episodeId: string,
  rawPatch: Record<string, unknown>,
): Promise<Episode | null> {
  const existing = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!existing) return null;

  assertEpisodeEditable(existing);

  const patch = normalizeEpisodePatch(pickAllowedEpisodePatch(rawPatch));
  if (Object.keys(patch).length === 0) {
    return existing;
  }

  if (patch.bed_id !== undefined && patch.bed_id !== existing.bed_id) {
    if (existing.bed_id) {
      await deps.bedRepo.releaseReservation(tenantId, existing.bed_id, episodeId);
    }
    if (patch.bed_id) {
      const reserved = await deps.bedRepo.reserveForEpisode(tenantId, patch.bed_id, episodeId);
      if (!reserved) {
        throw new Error("Selected bed is not available");
      }
    }
  }

  return deps.episodeRepo.update(tenantId, episodeId, patch);
}

export type { EpisodePatch };
