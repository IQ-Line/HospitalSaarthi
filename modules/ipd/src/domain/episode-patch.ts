import type { Episode, EpisodePatch, EpisodeStatus } from "./episode.js";
import { ALLOWED_PATCH_FIELDS, EDITABLE_EPISODE_STATUSES } from "./episode.js";

export function isEditableEpisodeStatus(status: EpisodeStatus): boolean {
  return (EDITABLE_EPISODE_STATUSES as readonly string[]).includes(status);
}

/** Strip disallowed keys before repo update. Status transitions use a dedicated endpoint in Phase 1. */
export function pickAllowedEpisodePatch(patch: Record<string, unknown>): EpisodePatch {
  const out: EpisodePatch = {};
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (patch[key] !== undefined) {
      (out as Record<string, unknown>)[key] = patch[key];
    }
  }
  return out;
}

export function normalizeEpisodePatch(patch: EpisodePatch): EpisodePatch {
  const next = { ...patch };
  if (typeof next.deposit_amount === "number") {
    next.deposit_amount = String(next.deposit_amount);
  }
  return next;
}

export function assertEpisodeEditable(episode: Episode): void {
  if (!isEditableEpisodeStatus(episode.status)) {
    throw new Error(`Cannot edit episode in status '${episode.status}'`);
  }
}
