import type { Episode, EpisodePatch, EpisodeRepo } from "../domain/episode.js";
import {
  assertEpisodeEditable,
  normalizeEpisodePatch,
  pickAllowedEpisodePatch,
} from "../domain/episode-patch.js";

type UpdateAdmissionDeps = {
  episodeRepo: EpisodeRepo;
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

  return deps.episodeRepo.update(tenantId, episodeId, patch);
}

export type { EpisodePatch };
