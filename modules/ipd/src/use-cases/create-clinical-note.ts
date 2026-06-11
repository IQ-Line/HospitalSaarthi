import { randomUUID } from "node:crypto";
import type { EpisodeRepo } from "../domain/episode.js";
import type {
  AuthorRole,
  ClinicalNote,
  ClinicalNoteContent,
  ClinicalNoteRepo,
  ClinicalNoteType,
} from "../domain/clinical-note.js";

export type CreateClinicalNoteInput = {
  note_type: ClinicalNoteType;
  author_role: AuthorRole;
  author_specialty_code?: string | null;
  content: ClinicalNoteContent;
};

type Deps = {
  episodeRepo: EpisodeRepo;
  clinicalNoteRepo: ClinicalNoteRepo;
};

export async function createClinicalNote(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  authorId: string,
  input: CreateClinicalNoteInput,
): Promise<ClinicalNote | null> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;

  const ts = new Date().toISOString();
  const row: ClinicalNote = {
    id: randomUUID(),
    iq_tenant_id: tenantId,
    episode_id: episodeId,
    note_type: input.note_type,
    author_id: authorId,
    author_role: input.author_role,
    author_specialty_code: input.author_specialty_code ?? null,
    content: input.content,
    status: "draft",
    finalized_at: null,
    finalized_by: null,
    signed_at: null,
    signed_by: null,
    created_at: ts,
    updated_at: ts,
  };
  return deps.clinicalNoteRepo.insert(row);
}
