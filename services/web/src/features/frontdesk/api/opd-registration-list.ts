import { fetchEmpiPatientLookupMap, type EmpiPatient } from '@/features/opd-patients/api/empi-patients';
import type {
  RegistrationListItemResponse,
  RegistrationListPageResponse,
  RegistrationVisitResponse,
} from '@/features/frontdesk/types';
import { listRegistrations, listRegistrationVisits } from './registrations';

export type OpdRegistrationDeskListParams = {
  page: number;
  limit: number;
  q?: string;
};

function mapVisitToRegistrationListItem(
  visit: RegistrationVisitResponse,
  empi: EmpiPatient | undefined,
  registration: RegistrationListItemResponse | undefined,
): RegistrationListItemResponse {
  return {
    registration_id: registration?.registration_id ?? '',
    iq_tenant_id: visit.iq_tenant_id,
    id: visit.id,
    visit_id: visit.visit_id,
    patient_id: visit.patient_id,
    patient_uhid: registration?.patient_uhid ?? empi?.uhid ?? '',
    patient_abha_number: registration?.patient_abha_number ?? empi?.abha_number ?? null,
    patient_abha_address: registration?.patient_abha_address ?? null,
    patient_full_name: registration?.patient_full_name ?? empi?.full_name ?? '',
    patient_phone_number: registration?.patient_phone_number ?? empi?.phone_number ?? '',
    patient_gender: registration?.patient_gender ?? empi?.gender ?? null,
    patient_date_of_birth: registration?.patient_date_of_birth ?? empi?.date_of_birth ?? null,
    patient_year_of_birth: registration?.patient_year_of_birth ?? null,
    patient_source_record_id: registration?.patient_source_record_id ?? '',
    facility_id: visit.facility_id,
    visit_type: visit.visit_type,
    visit_type_label: registration?.visit_type_label ?? visit.visit_type,
    department_id: visit.department_id,
    doctor_id: visit.doctor_id,
    appointment_id: visit.appointment_id,
    registration_status: visit.status,
    registration_status_label: registration?.registration_status_label ?? visit.status,
    created_by: visit.created_by,
    updated_by: visit.updated_by,
    created_at: visit.created_at,
    updated_at: visit.updated_at,
  };
}

async function fetchRegistrationSnapshotsByPatientIds(
  patientIds: readonly string[],
): Promise<Map<string, RegistrationListItemResponse>> {
  const uniqueIds = [...new Set(patientIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const entries = await Promise.all(
    uniqueIds.map(async (patientId) => {
      const page = await listRegistrations({ patient_id: patientId, page: 1, limit: 1 });
      const row = page.data[0];
      return row ? ([patientId, row] as const) : null;
    }),
  );

  return new Map(entries.filter((entry): entry is readonly [string, RegistrationListItemResponse] => entry != null));
}

/**
 * Desk registration list — one row per OPD encounter (`registration.visit`).
 * Patient demographics come from the registration snapshot when present, else EMPI.
 */
export async function fetchOpdRegistrationDeskList(
  params: OpdRegistrationDeskListParams,
): Promise<RegistrationListPageResponse> {
  const q = params.q?.trim();

  if (q) {
    return listRegistrations({
      page: params.page,
      limit: params.limit,
      q,
    });
  }

  const visitPage = await listRegistrationVisits({
    page: params.page,
    limit: params.limit,
  });

  const patientIds = visitPage.data.map((visit) => visit.patient_id);
  const [empiById, registrationByPatientId] = await Promise.all([
    fetchEmpiPatientLookupMap(patientIds),
    fetchRegistrationSnapshotsByPatientIds(patientIds),
  ]);

  return {
    data: visitPage.data.map((visit) =>
      mapVisitToRegistrationListItem(
        visit,
        empiById.get(visit.patient_id),
        registrationByPatientId.get(visit.patient_id),
      ),
    ),
    total: visitPage.total,
    page: visitPage.page,
    limit: visitPage.limit,
    total_pages: visitPage.total_pages,
  };
}
