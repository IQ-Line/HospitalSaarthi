import { apiClient } from '@/lib/api-client';
import { ipdUseMock } from './admissions';
import type {
  ClinicalNote,
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
} from '../lib/clinical-note-types';
import {
  createMockClinicalNote,
  finalizeMockClinicalNote,
  listMockClinicalNotes,
  updateMockClinicalNote,
} from '../mock/clinical-notes';

const IPD_PREFIX = '/api/ipd/v1';

type ClinicalNoteListResponse = { data: ClinicalNote[] };

export async function fetchClinicalNotes(admissionId: string): Promise<ClinicalNote[]> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 80));
    return listMockClinicalNotes(admissionId);
  }
  const res = await apiClient<ClinicalNoteListResponse>(
    `${IPD_PREFIX}/admissions/${admissionId}/clinical-notes`,
  );
  return res.data;
}

export async function createClinicalNote(
  admissionId: string,
  input: CreateClinicalNoteInput,
): Promise<ClinicalNote> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 100));
    return createMockClinicalNote(admissionId, input);
  }
  return apiClient<ClinicalNote>(`${IPD_PREFIX}/admissions/${admissionId}/clinical-notes`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateClinicalNote(
  admissionId: string,
  noteId: string,
  input: UpdateClinicalNoteInput,
): Promise<ClinicalNote> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 100));
    const updated = updateMockClinicalNote(admissionId, noteId, input);
    if (!updated) throw new Error('Note not found or not editable');
    return updated;
  }
  return apiClient<ClinicalNote>(
    `${IPD_PREFIX}/admissions/${admissionId}/clinical-notes/${noteId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export async function finalizeClinicalNote(
  admissionId: string,
  noteId: string,
): Promise<ClinicalNote> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 100));
    const finalized = finalizeMockClinicalNote(admissionId, noteId);
    if (!finalized) throw new Error('Note not found or not finalizable');
    return finalized;
  }
  return apiClient<ClinicalNote>(
    `${IPD_PREFIX}/admissions/${admissionId}/clinical-notes/${noteId}/finalize`,
    { method: 'POST' },
  );
}
