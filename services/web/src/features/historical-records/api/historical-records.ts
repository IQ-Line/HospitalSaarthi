import { apiClient } from '@/lib/api-client';
import { listRegistrationVisits } from '@/features/frontdesk/api/registrations';
import type { RegistrationVisitResponse } from '@/features/frontdesk/types';
import { resolveOpdConsultationTenantId } from '@/features/opd-patients/lib/opd-consultation-tenant';
import {
  empiPatientAgeYears,
  fetchEmpiPatientDetail,
  fetchEmpiPatientLookupMap,
  mapEmpiPatientToOpdDetails,
  type EmpiPatient,
} from '@/features/opd-patients/api/empi-patients';
import { fetchPatientHealthDocuments } from '@/features/create-rx/api/health-documents';
import type { OpdPrescriptionListItem } from '@/features/create-rx/api/opd-prescription-types';
import { fetchOpdEncounterOverlaysByVisitIds } from '@/features/opd-patients/api/opd-encounter-overlay';
import { SEARCH_VISITS_PER_PATIENT_LIMIT } from './constants';
import { fetchDoctorLookupMap, resolveDoctorName } from './doctor-lookup';
import { isWithinDateRange } from '../lib/formatters';
import type {
  HistoricalDocumentItem,
  HistoricalPatientProfile,
  HistoricalRecordRow,
  HistoricalRecordsFilters,
  HistoricalRecordsListResponse,
  HistoricalReportHiType,
  HistoricalReportItem,
  HistoricalSearchField,
  HistoricalClinicalReportType,
} from '../types';

const EMPI_PATIENTS_BASE = '/api/empi/v1/patients';
const OPD_PREFIX = '/api/v1/opd';

interface EmpiSearchPage {
  data: EmpiPatient[];
  total: number;
}

function requireTenantId(): string {
  const tenantId = resolveOpdConsultationTenantId();
  if (!tenantId) throw new Error('Tenant context is missing');
  return tenantId;
}

function formatVisitNumber(visit: RegistrationVisitResponse): string {
  const formatted = visit.visit_id?.trim();
  if (formatted) return formatted;
  const id = visit.id?.replace(/-/g, '') ?? '';
  return id ? id.slice(0, 12).toUpperCase() : '—';
}

async function searchEmpiByField(
  field: HistoricalSearchField,
  query: string,
): Promise<EmpiPatient[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2 && field === 'patient_name') return [];
  if (trimmed.length < 1 && field !== 'patient_name') return [];

  if (field === 'abha_address') {
    try {
      const match = await apiClient<{ patientId?: string; id?: string }>(
        `${EMPI_PATIENTS_BASE}/find?abha_address=${encodeURIComponent(trimmed)}`,
      );
      const patientId = match?.patientId?.trim() || match?.id?.trim();
      if (!patientId) return [];
      const detail = await fetchEmpiPatientDetail(patientId);
      return [detail.patient];
    } catch {
      return [];
    }
  }

  const sp = new URLSearchParams();
  sp.set('page', '1');
  sp.set('limit', '100');

  if (field === 'patient_name') sp.set('name', trimmed);
  else if (field === 'mobile_number') sp.set('phone', trimmed.replace(/\D/g, ''));
  else if (field === 'abha_number') sp.set('abha_number', trimmed);
  else if (field === 'uhid') sp.set('uhid', trimmed);

  const result = await apiClient<EmpiSearchPage>(`${EMPI_PATIENTS_BASE}?${sp.toString()}`);
  return result.data;
}

async function fetchVisitsForPatients(patientIds: string[]): Promise<RegistrationVisitResponse[]> {
  if (patientIds.length === 0) return [];

  const results = await Promise.all(
    patientIds.map(async (patientId) => {
      const page = await listRegistrationVisits({
        patient_id: patientId,
        page: 1,
        limit: SEARCH_VISITS_PER_PATIENT_LIMIT,
      });
      return page.data;
    }),
  );
  return results.flat();
}

function mapVisitToRow(
  visit: RegistrationVisitResponse,
  empi: EmpiPatient | undefined,
  doctorLookup: Map<string, string>,
): HistoricalRecordRow {
  const age = empi ? empiPatientAgeYears(empi) : 0;
  const gender = empi?.gender ?? 'other';

  return {
    id: visit.id,
    patientId: visit.patient_id,
    patientName: empi?.full_name?.trim() || '—',
    age,
    gender: gender === 'male' || gender === 'female' ? gender : 'other',
    abhaNumber: empi?.abha_number?.trim() || 'NA',
    uhid: empi?.uhid?.trim() || '—',
    mobileNumber: empi?.phone_number?.trim() || '—',
    doctorName: resolveDoctorName(visit.doctor_id, doctorLookup),
    lastVisitAt: visit.created_at,
    visitNumber: formatVisitNumber(visit),
    lastUpdatedAt: visit.updated_at,
  };
}

export async function fetchHistoricalRecordsList(params: {
  page: number;
  limit: number;
  filters: HistoricalRecordsFilters;
}): Promise<HistoricalRecordsListResponse> {
  const { page, limit, filters } = params;
  const search = filters.search.trim();

  const doctorLookup = await fetchDoctorLookupMap();

  let visits: RegistrationVisitResponse[];

  if (search.length >= 2 || (search.length >= 1 && filters.searchField !== 'patient_name')) {
    const patients = await searchEmpiByField(filters.searchField, search);
    const patientIds = [...new Set(patients.map((p) => p.id))];
    visits = await fetchVisitsForPatients(patientIds);
    const empiById = new Map(patients.map((p) => [p.id, p]));

    let items = visits
      .filter((v) => isWithinDateRange(v.updated_at, filters.startDate, filters.endDate))
      .map((v) => mapVisitToRow(v, empiById.get(v.patient_id), doctorLookup))
      .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));

    const total = items.length;
    const start = (page - 1) * limit;
    items = items.slice(start, start + limit);
    return { items, total };
  }

  const visitPage = await listRegistrationVisits({ page, limit });
  const empiById = await fetchEmpiPatientLookupMap(visitPage.data.map((v) => v.patient_id));

  let items = visitPage.data
    .filter((v) => isWithinDateRange(v.updated_at, filters.startDate, filters.endDate))
    .map((v) => mapVisitToRow(v, empiById.get(v.patient_id), doctorLookup));

  const total =
    filters.startDate || filters.endDate ? items.length : visitPage.total;

  return { items, total };
}

export async function fetchHistoricalPatientProfile(
  patientId: string,
): Promise<HistoricalPatientProfile> {
  const [detail, visitPage] = await Promise.all([
    fetchEmpiPatientDetail(patientId),
    listRegistrationVisits({ patient_id: patientId, page: 1, limit: 1 }),
  ]);

  const mapped = mapEmpiPatientToOpdDetails(detail);
  return {
    firstName: mapped.firstName === '-' ? 'Not provided' : mapped.firstName,
    middleName: mapped.middleName === '-' ? 'Not provided' : mapped.middleName,
    lastName: mapped.lastName === '-' ? 'Not provided' : mapped.lastName,
    uhid: mapped.uhid,
    abhaNumber: mapped.abhaNumber === 'N/A' ? 'Not provided' : mapped.abhaNumber,
    abhaAddress: mapped.abhaAddress === 'N/A' ? 'Not provided' : mapped.abhaAddress,
    phoneNumber: mapped.phoneNumber === '-' ? 'Not provided' : mapped.phoneNumber,
    dateOfBirth: mapped.dateOfBirth === '-' ? 'Not provided' : mapped.dateOfBirth,
    ageDisplay: mapped.ageDisplay,
    gender: mapped.gender,
    streetAddress: mapped.streetAddress === '-' ? 'Not provided' : mapped.streetAddress,
    district: mapped.district === '-' ? 'Not provided' : mapped.district,
    state: mapped.state === '-' ? 'Not provided' : mapped.state,
    pinCode: mapped.pinCode === '-' ? 'Not provided' : mapped.pinCode,
    visitCount: visitPage.total,
    lastUpdated: mapped.lastUpdated,
  };
}

export async function fetchHistoricalPatientDocuments(
  patientId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    search?: string;
    documentType?: string;
  },
): Promise<HistoricalDocumentItem[]> {
  const [response, doctorLookup, visitPage] = await Promise.all([
    fetchPatientHealthDocuments(patientId, undefined, 1, 100),
    fetchDoctorLookupMap(),
    listRegistrationVisits({ patient_id: patientId, page: 1, limit: 200 }),
  ]);

  const visitById = new Map(visitPage.data.map((v) => [v.id, v]));
  const search = options?.search?.trim().toLowerCase() ?? '';

  return response.data
    .filter((doc) => {
      if (options?.documentType && options.documentType !== 'all') {
        if (doc.hi_type !== options.documentType) return false;
      }
      if (!isWithinDateRange(doc.uploaded_at, options?.startDate ?? '', options?.endDate ?? '')) {
        return false;
      }
      if (search) {
        const hay = `${doc.document_title} ${doc.hi_type} ${doc.file_name}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    })
    .map((doc) => {
      const visit = doc.visit_id ? visitById.get(doc.visit_id) : undefined;
      return {
        id: doc.id,
        doctorName: resolveDoctorName(visit?.doctor_id, doctorLookup),
        hiType: doc.hi_type,
        visitNumber: visit ? formatVisitNumber(visit) : '—',
        reportTime: doc.uploaded_at,
        documentTitle: doc.document_title,
        downloadUrl: doc.download_url,
        fileName: doc.file_name,
        fileType: doc.file_type,
      };
    });
}

async function listPatientPrescriptions(patientId: string): Promise<OpdPrescriptionListItem[]> {
  const tenantId = requireTenantId();
  const response = await apiClient<{ data: OpdPrescriptionListItem[]; total: number }>(
    `${OPD_PREFIX}/prescriptions?tenant_id=${encodeURIComponent(tenantId)}&patient_id=${encodeURIComponent(patientId)}&limit=200`,
  );
  return response.data;
}

const REPORT_HI_TYPES: HistoricalReportHiType[] = [
  'OP Consultation Record',
  'Prescription Record',
  'Diagnostic Report Record',
  'Immunization Record',
];

const CLINICAL_REPORT_TYPES: HistoricalClinicalReportType[] = [
  'op-consultation',
  'prescription',
  'immunization',
];

const CLINICAL_REPORT_LABELS: Record<HistoricalClinicalReportType, HistoricalReportHiType> = {
  'op-consultation': 'OP Consultation Record',
  prescription: 'Prescription Record',
  immunization: 'Immunization Record',
};

const CLINICAL_REPORT_TITLES: Record<HistoricalClinicalReportType, string> = {
  'op-consultation': 'OP Consultation',
  prescription: 'Prescription',
  immunization: 'Immunization',
};

function pushClinicalReportsForVisit(
  reports: HistoricalReportItem[],
  opts: {
    visitId: string;
    visitNumber: string;
    doctorName: string;
    reportTime: string;
    prescriptionId?: string;
    /** Backend only renders HTML/PDF after consultation is finalized. */
    viewable: boolean;
  },
): void {
  if (!opts.viewable) return;
  for (const clinicalReportType of CLINICAL_REPORT_TYPES) {
    const hiType = CLINICAL_REPORT_LABELS[clinicalReportType];
    const label = CLINICAL_REPORT_TITLES[clinicalReportType];
    reports.push({
      id: `rx-${clinicalReportType}-${opts.visitId}`,
      title: `${label} — ${opts.visitNumber}`,
      hiType,
      visitNumber: opts.visitNumber,
      doctorName: opts.doctorName,
      reportTime: opts.reportTime,
      source: 'prescription',
      prescriptionId: opts.prescriptionId,
      visitId: opts.visitId,
      clinicalReportType,
    });
  }
}

export async function fetchHistoricalPatientReports(
  patientId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    search?: string;
    hiType?: string;
    reportCategory?: string;
  },
): Promise<HistoricalReportItem[]> {
  const [prescriptions, healthDocs, doctorLookup, visitPage] = await Promise.all([
    listPatientPrescriptions(patientId).catch(() => [] as OpdPrescriptionListItem[]),
    fetchPatientHealthDocuments(patientId, undefined, 1, 100),
    fetchDoctorLookupMap(),
    listRegistrationVisits({ patient_id: patientId, page: 1, limit: 200 }),
  ]);

  const visitById = new Map(visitPage.data.map((v) => [v.id, v]));
  const overlayByVisitId = await fetchOpdEncounterOverlaysByVisitIds(
    visitPage.data.map((v) => v.id),
  );
  const search = options?.search?.trim().toLowerCase() ?? '';
  const reports: HistoricalReportItem[] = [];
  const visitsWithClinicalReports = new Set<string>();

  for (const rx of prescriptions) {
    if (rx.status !== 'final') continue;
    const visit = visitById.get(rx.visit_id);
    const reportTime = rx.finalized_at ?? rx.updated_at ?? rx.created_at;
    if (!isWithinDateRange(reportTime, options?.startDate ?? '', options?.endDate ?? '')) continue;

    const visitNumber = visit ? formatVisitNumber(visit) : '—';
    const doctorName = resolveDoctorName(rx.doctor_id ?? visit?.doctor_id, doctorLookup);

    pushClinicalReportsForVisit(reports, {
      visitId: rx.visit_id,
      visitNumber,
      doctorName,
      reportTime,
      prescriptionId: rx.id,
      viewable: true,
    });
    visitsWithClinicalReports.add(rx.visit_id);
  }

  for (const visit of visitPage.data) {
    if (visitsWithClinicalReports.has(visit.id)) continue;
    const overlay = overlayByVisitId.get(visit.id);
    if (!overlay || overlay.prescriptionStatus === 'cancelled') continue;
    if (overlay.prescriptionStatus !== 'final') continue;

    const reportTime = visit.updated_at ?? visit.created_at;
    if (!isWithinDateRange(reportTime, options?.startDate ?? '', options?.endDate ?? '')) continue;

    pushClinicalReportsForVisit(reports, {
      visitId: visit.id,
      visitNumber: formatVisitNumber(visit),
      doctorName: resolveDoctorName(visit.doctor_id, doctorLookup),
      reportTime,
      viewable: true,
    });
    visitsWithClinicalReports.add(visit.id);
  }

  for (const doc of healthDocs.data) {
    if (!REPORT_HI_TYPES.includes(doc.hi_type as HistoricalReportHiType)) continue;
    if (!isWithinDateRange(doc.uploaded_at, options?.startDate ?? '', options?.endDate ?? '')) {
      continue;
    }

    const visit = doc.visit_id ? visitById.get(doc.visit_id) : undefined;
    reports.push({
      id: `doc-${doc.id}`,
      title: doc.document_title,
      hiType: doc.hi_type as HistoricalReportHiType,
      visitNumber: visit ? formatVisitNumber(visit) : '—',
      doctorName: resolveDoctorName(visit?.doctor_id, doctorLookup),
      reportTime: doc.uploaded_at,
      source: 'health_document',
      documentId: doc.id,
      visitId: doc.visit_id ?? undefined,
      downloadUrl: doc.download_url,
      fileName: doc.file_name,
      fileType: doc.file_type,
    });
  }

  return reports
    .filter((report) => {
      if (options?.hiType && options.hiType !== 'all' && report.hiType !== options.hiType) {
        return false;
      }
      if (
        options?.reportCategory &&
        options.reportCategory !== 'all' &&
        report.hiType !== options.reportCategory
      ) {
        return false;
      }
      if (search) {
        const hay = `${report.title} ${report.hiType} ${report.visitNumber}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => b.reportTime.localeCompare(a.reportTime));
}

export { REPORT_HI_TYPES };
