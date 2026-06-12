import { listRegistrationVisits } from '@/features/frontdesk/api/registrations';
import type { CreateRxFormData } from '../types';
import type { OpdPrescriptionSession } from './opd-prescription-types';
import { fetchPrescriptionByVisitId } from './opd-prescription';

export interface PriorVisitMedicalRecord {
  visitId: string;
  visitNumber: string;
  visitDate: string;
  prescriptionStatus: OpdPrescriptionSession['prescription_status'];
  medicalHistory: CreateRxFormData['medicalHistory'];
  allergies: CreateRxFormData['allergyDetails'];
  chiefComplaints: CreateRxFormData['chiefComplaints'];
  diagnosis: CreateRxFormData['diagnosis'];
  medicines: CreateRxFormData['medicines'];
  vitals: CreateRxFormData['vitals'];
}

/** Prior visits for the same patient (excludes current visit), with prescription medical history. */
export async function fetchPriorVisitMedicalHistory(
  patientId: string,
  currentVisitId: string,
): Promise<PriorVisitMedicalRecord[]> {
  const patientKey = patientId.trim();
  const currentKey = currentVisitId.trim();
  if (!patientKey) return [];

  const visitPage = await listRegistrationVisits({
    patient_id: patientKey,
    page: 1,
    limit: 100,
  });

  const priorVisits = visitPage.data
    .filter((v) => v.id !== currentKey)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const sessions = await Promise.all(
    priorVisits.map(async (visit) => {
      const session = await fetchPrescriptionByVisitId(visit.id);
      if (!session) return null;

      return {
        visitId: visit.id,
        visitNumber: visit.visit_id?.trim() || visit.id.slice(0, 8),
        visitDate: visit.updated_at,
        prescriptionStatus: session.prescription_status,
        medicalHistory: session.form_data.medicalHistory,
        allergies: session.form_data.allergyDetails,
        chiefComplaints: session.form_data.chiefComplaints,
        diagnosis: session.form_data.diagnosis,
        medicines: session.form_data.medicines,
        vitals: session.form_data.vitals,
      } satisfies PriorVisitMedicalRecord;
    }),
  );

  return sessions.filter((row): row is PriorVisitMedicalRecord => row !== null);
}
