import type { EpisodeRepo } from "../domain/episode.js";
import type {
  AuthorRole,
  ClinicalNote,
  ClinicalNoteContent,
  ClinicalNoteRepo,
  ClinicalNoteType,
} from "../domain/clinical-note.js";
import { canEditClinicalNote } from "../domain/clinical-note.js";

export type UpdateClinicalNoteInput = {
  note_type?: ClinicalNoteType;
  author_role?: AuthorRole;
  author_specialty_code?: string | null;
  content?: ClinicalNoteContent;
};

type Deps = {
  episodeRepo: EpisodeRepo;
  clinicalNoteRepo: ClinicalNoteRepo;
};

export type UpdateClinicalNoteResult =
  | { ok: true; note: ClinicalNote }
  | { ok: false; reason: "not_found" | "forbidden" };

export async function updateClinicalNoteDraft(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  noteId: string,
  userId: string,
  input: UpdateClinicalNoteInput,
): Promise<UpdateClinicalNoteResult> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return { ok: false, reason: "not_found" };

  const cur = await deps.clinicalNoteRepo.getById(tenantId, episodeId, noteId);
  if (!cur) return { ok: false, reason: "not_found" };
  if (!canEditClinicalNote(cur, userId)) return { ok: false, reason: "forbidden" };

  const patch: Partial<ClinicalNote> = {};
  if (input.note_type !== undefined) patch.note_type = input.note_type;
  if (input.author_role !== undefined) patch.author_role = input.author_role;
  if (input.author_specialty_code !== undefined) {
    patch.author_specialty_code = input.author_specialty_code;
  }
  if (input.content !== undefined) patch.content = input.content;

  const updated = await deps.clinicalNoteRepo.update(tenantId, episodeId, noteId, patch);
  if (!updated) return { ok: false, reason: "not_found" };
  return { ok: true, note: updated };
}
