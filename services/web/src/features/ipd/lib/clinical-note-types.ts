/** UI note type slugs (Notes tab tiles). */
export type ClinicalNoteUiType =
  | 'admission'
  | 'progress'
  | 'procedure'
  | 'consultation'
  | 'discharge_summary'
  | 'operation'
  | 'transfer'
  | 'handover';

/** API note_type values (`ipd.clinical_notes.note_type`). */
export type ClinicalNoteApiType =
  | 'admission_note'
  | 'progress_note'
  | 'procedure_note'
  | 'consultation_note'
  | 'discharge_summary_note'
  | 'operation_note'
  | 'transfer_note'
  | 'handover_note'
  | 'nursing_note';

export type ClinicalNoteStatus = 'draft' | 'finalized' | 'signed';

export type AuthorRole =
  | 'consultant'
  | 'resident'
  | 'registrar'
  | 'nurse'
  | 'specialist'
  | 'intern';

export type ClinicalNoteContent = {
  structured?: string;
  narrative?: string;
  sections?: Record<string, string>;
};

export type ClinicalNote = {
  id: string;
  iq_tenant_id: string;
  episode_id: string;
  note_type: ClinicalNoteApiType;
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
};

export type CreateClinicalNoteInput = {
  note_type: ClinicalNoteApiType;
  author_role: AuthorRole;
  author_specialty_code?: string | null;
  content: ClinicalNoteContent;
};

export type UpdateClinicalNoteInput = Partial<CreateClinicalNoteInput>;

const UI_TO_API: Record<ClinicalNoteUiType, ClinicalNoteApiType> = {
  admission: 'admission_note',
  progress: 'progress_note',
  procedure: 'procedure_note',
  consultation: 'consultation_note',
  discharge_summary: 'discharge_summary_note',
  operation: 'operation_note',
  transfer: 'transfer_note',
  handover: 'handover_note',
};

const API_TO_UI: Partial<Record<ClinicalNoteApiType, ClinicalNoteUiType>> = Object.fromEntries(
  Object.entries(UI_TO_API).map(([ui, api]) => [api, ui]),
) as Partial<Record<ClinicalNoteApiType, ClinicalNoteUiType>>;

export function uiNoteTypeToApi(uiType: ClinicalNoteUiType): ClinicalNoteApiType {
  return UI_TO_API[uiType];
}

export function apiNoteTypeToUi(apiType: ClinicalNoteApiType): ClinicalNoteUiType | null {
  return API_TO_UI[apiType] ?? null;
}

export function clinicalNoteStatusLabel(status: ClinicalNoteStatus): string {
  if (status === 'draft') return 'Draft';
  if (status === 'finalized') return 'Finalized';
  return 'Signed';
}
