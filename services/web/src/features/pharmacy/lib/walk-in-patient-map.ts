import type { SaveWalkInPatientInput, WalkInPatient, WalkInPatientDraft } from '../types';

export function walkInPatientDraftFromRecord(patient: WalkInPatient): WalkInPatientDraft {
  const gender = patient.gender;
  return {
    first_name: patient.first_name,
    last_name: patient.last_name ?? '',
    phone: patient.phone ?? '',
    gender:
      gender === 'male' || gender === 'female' || gender === 'other' ? gender : '',
    date_of_birth: patient.date_of_birth ?? '',
  };
}

export function saveWalkInPatientInputFromDraft(
  patient: WalkInPatientDraft,
): SaveWalkInPatientInput {
  return {
    first_name: patient.first_name.trim(),
    last_name: patient.last_name.trim() || null,
    phone: patient.phone.trim() || null,
    gender: patient.gender,
    date_of_birth: patient.date_of_birth.trim() || null,
  };
}
