import type { EpisodeRepo } from "../domain/episode.js";
import type {
  ClinicalNote,
  ClinicalNoteListQuery,
  ClinicalNoteRepo,
} from "../domain/clinical-note.js";

type Deps = {
  episodeRepo: EpisodeRepo;
  clinicalNoteRepo: ClinicalNoteRepo;
};

export async function listClinicalNotes(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  query?: ClinicalNoteListQuery,
): Promise<ClinicalNote[] | null> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;
  return deps.clinicalNoteRepo.listByEpisode(tenantId, episodeId, query);
}

export async function getClinicalNote(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  noteId: string,
): Promise<ClinicalNote | null> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;
  return deps.clinicalNoteRepo.getById(tenantId, episodeId, noteId);
}
