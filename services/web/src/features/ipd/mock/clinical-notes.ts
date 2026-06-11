import type {
  ClinicalNote,
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
} from '../lib/clinical-note-types';

const DEV_AUTHOR_ID = '00000000-0000-0000-0000-000000000001';
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000007';

const store = new Map<string, ClinicalNote>();

function key(admissionId: string, noteId: string) {
  return `${admissionId}:${noteId}`;
}

function listForAdmission(admissionId: string): ClinicalNote[] {
  return [...store.values()]
    .filter((n) => n.episode_id === admissionId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listMockClinicalNotes(admissionId: string): ClinicalNote[] {
  return listForAdmission(admissionId);
}

export function createMockClinicalNote(
  admissionId: string,
  input: CreateClinicalNoteInput,
): ClinicalNote {
  const ts = new Date().toISOString();
  const note: ClinicalNote = {
    id: crypto.randomUUID(),
    iq_tenant_id: DEV_TENANT_ID,
    episode_id: admissionId,
    author_id: DEV_AUTHOR_ID,
    author_specialty_code: input.author_specialty_code ?? null,
    status: 'draft',
    finalized_at: null,
    finalized_by: null,
    signed_at: null,
    signed_by: null,
    created_at: ts,
    updated_at: ts,
    ...input,
  };
  store.set(key(admissionId, note.id), note);
  return note;
}

export function updateMockClinicalNote(
  admissionId: string,
  noteId: string,
  input: UpdateClinicalNoteInput,
): ClinicalNote | null {
  const cur = store.get(key(admissionId, noteId));
  if (!cur || cur.status !== 'draft') return null;
  const updated: ClinicalNote = {
    ...cur,
    ...input,
    content: input.content ?? cur.content,
    updated_at: new Date().toISOString(),
  };
  store.set(key(admissionId, noteId), updated);
  return updated;
}

export function finalizeMockClinicalNote(
  admissionId: string,
  noteId: string,
): ClinicalNote | null {
  const cur = store.get(key(admissionId, noteId));
  if (!cur || cur.status !== 'draft') return null;
  const ts = new Date().toISOString();
  const updated: ClinicalNote = {
    ...cur,
    status: 'finalized',
    finalized_at: ts,
    finalized_by: DEV_AUTHOR_ID,
    updated_at: ts,
  };
  store.set(key(admissionId, noteId), updated);
  return updated;
}
