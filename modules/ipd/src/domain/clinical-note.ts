export type ClinicalNoteType =
  | "admission_note"
  | "progress_note"
  | "procedure_note"
  | "consultation_note"
  | "discharge_summary_note"
  | "operation_note"
  | "transfer_note"
  | "handover_note"
  | "nursing_note";

export type ClinicalNoteStatus = "draft" | "finalized" | "signed";

export type AuthorRole =
  | "consultant"
  | "resident"
  | "registrar"
  | "nurse"
  | "specialist"
  | "intern";

export type ClinicalNoteContent = {
  structured?: string;
  narrative?: string;
  sections?: Record<string, string>;
};

export interface ClinicalNote {
  id: string;
  iq_tenant_id: string;
  episode_id: string;
  note_type: ClinicalNoteType;
  author_id: string;
  author_role: AuthorRole;
  author_specialty_code: string | null;
  content: ClinicalNoteContent;
  status: ClinicalNoteStatus;
  finalized_at: string | null;
  finalized_by: string | null;
  signed_at: string | null;
  signed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalNoteListQuery {
  status?: ClinicalNoteStatus;
  note_type?: ClinicalNoteType;
}

export interface ClinicalNoteRepo {
  listByEpisode(
    tenantId: string,
    episodeId: string,
    query?: ClinicalNoteListQuery,
  ): Promise<ClinicalNote[]>;
  getById(tenantId: string, episodeId: string, noteId: string): Promise<ClinicalNote | null>;
  insert(row: ClinicalNote): Promise<ClinicalNote>;
  update(
    tenantId: string,
    episodeId: string,
    noteId: string,
    patch: Partial<
      Pick<
        ClinicalNote,
        | "note_type"
        | "author_role"
        | "author_specialty_code"
        | "content"
        | "status"
        | "finalized_at"
        | "finalized_by"
        | "updated_at"
      >
    >,
  ): Promise<ClinicalNote | null>;
}

export function canEditClinicalNote(note: ClinicalNote, userId: string): boolean {
  return note.status === "draft" && note.author_id === userId;
}

export function canFinalizeClinicalNote(note: ClinicalNote, userId: string): boolean {
  return note.status === "draft" && note.author_id === userId;
}

export function toClinicalNoteApi(note: ClinicalNote): ClinicalNote {
  return note;
}
