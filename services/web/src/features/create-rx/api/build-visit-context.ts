import { listRegistrations } from '@/features/frontdesk/api/registrations';
import type { RegistrationListItemResponse } from '@/features/frontdesk/types';
import {
  empiPatientAgeYears,
  empiStatusToOpdVisitStatus,
  fetchEmpiPatientDetail,
  type EmpiPatientDetailResponse,
} from '@/features/opd-patients/api/empi-patients';
import type { CreateRxVisitContext } from '../types';

export function buildCreateRxVisitContext(
  detail: EmpiPatientDetailResponse,
  registration: RegistrationListItemResponse | null,
  _routeId: string,
): CreateRxVisitContext {
  const patient = detail.patient;
  const abhaAddress = detail.identifiers.find(
    (identifier) => identifier.identifier_type === 'abha_address',
  );

  const visitNumber = registration?.visit_id?.trim() || patient.uhid;
  const visitId = _routeId.trim() || patient.id;
  // OPD consultation status is tracked separately from front-desk registration_status.
  const status = empiStatusToOpdVisitStatus(patient.status);

  return {
    patient: {
      id: patient.id,
      firstName: patient.first_name,
      middleName: patient.middle_name?.trim() || undefined,
      lastName: patient.last_name?.trim() || '',
      gender: patient.gender,
      age: empiPatientAgeYears(patient),
      uhid: patient.uhid,
      phone: patient.phone_number,
      abhaNumber: patient.abha_number?.trim() || undefined,
      abhaAddress: abhaAddress?.identifier_value?.trim() || undefined,
    },
    visit: {
      id: visitId,
      visitNumber,
      status,
    },
  };
}

async function fetchLatestRegistrationForPatient(
  patientId: string,
): Promise<RegistrationListItemResponse | null> {
  try {
    const page = await listRegistrations({ page: 1, limit: 1, patient_id: patientId });
    return page.data[0] ?? null;
  } catch {
    return null;
  }
}

/** Resolves create-RX shell from EMPI patient id (and optional registration visit metadata). */
export async function fetchCreateRxVisitContextFromServices(
  visitOrPatientId: string,
): Promise<CreateRxVisitContext | null> {
  try {
    const detail = await fetchEmpiPatientDetail(visitOrPatientId);
    const registration = await fetchLatestRegistrationForPatient(detail.patient.id);
    return buildCreateRxVisitContext(detail, registration, visitOrPatientId);
  } catch {
    return null;
  }
}
