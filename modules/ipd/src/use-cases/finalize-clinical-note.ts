import type { EpisodeRepo } from "../domain/episode.js";
import type { ClinicalNote, ClinicalNoteRepo } from "../domain/clinical-note.js";
import { canFinalizeClinicalNote } from "../domain/clinical-note.js";

type Deps = {
  episodeRepo: EpisodeRepo;
  clinicalNoteRepo: ClinicalNoteRepo;
};

export type FinalizeClinicalNoteResult =
  | { ok: true; note: ClinicalNote }
  | { ok: false; reason: "not_found" | "forbidden" };

export async function finalizeClinicalNote(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  noteId: string,
  userId: string,
): Promise<FinalizeClinicalNoteResult> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return { ok: false, reason: "not_found" };

  const cur = await deps.clinicalNoteRepo.getById(tenantId, episodeId, noteId);
  if (!cur) return { ok: false, reason: "not_found" };
  if (!canFinalizeClinicalNote(cur, userId)) return { ok: false, reason: "forbidden" };

  const ts = new Date().toISOString();
  const updated = await deps.clinicalNoteRepo.update(tenantId, episodeId, noteId, {
    status: "finalized",
    finalized_at: ts,
    finalized_by: userId,
  });
  if (!updated) return { ok: false, reason: "not_found" };
  return { ok: true, note: updated };
}
