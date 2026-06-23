import { apiClient } from '@/lib/api-client';
import { listRegistrations, listRegistrationVisits } from '@/features/frontdesk/api/registrations';
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
import {
  fetchRegistrationSnapshotByPatientIds,
  resolvePatientAbhaNumber,
  type RegistrationPatientSnapshot,
} from './registration-snapshot';
import { isWithinDateRange, isHistoricalSearchQueryValid, normalizeAbhaForSearch, normalizeIndianPhoneForSearch } from '../lib/formatters';
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
  if (!isHistoricalSearchQueryValid(field, trimmed)) return [];

  if (field === 'abha_address') {
    const abhaAddress = trimmed.toLowerCase();
    try {
      const match = await apiClient<{ patientId?: string; id?: string }>(
        `${EMPI_PATIENTS_BASE}/find?abha_address=${encodeURIComponent(abhaAddress)}`,
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
  else if (field === 'mobile_number') {
    const phone = normalizeIndianPhoneForSearch(trimmed);
    if (!phone) return [];
    sp.set('phone', phone);
  } else if (field === 'abha_number') sp.set('abha_number', normalizeAbhaForSearch(trimmed));
  else if (field === 'uhid') sp.set('uhid', trimmed);

  const result = await apiClient<EmpiSearchPage>(`${EMPI_PATIENTS_BASE}?${sp.toString()}`);
  return result.data;
}

async function searchRegistrationPatientIds(
  field: HistoricalSearchField,
  query: string,
): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed || !isHistoricalSearchQueryValid(field, trimmed)) return [];

  if (field === 'patient_name') {
    const page = await listRegistrations({ page: 1, limit: 100, name: trimmed });
    return [...new Set(page.data.map((row) => row.patient_id).filter(Boolean))];
  }

  if (field === 'mobile_number') {
    const digits = trimmed.replace(/\D/g, '');
    const page = await listRegistrations({ page: 1, limit: 100, mobile: digits.slice(-10) });
    return [...new Set(page.data.map((row) => row.patient_id).filter(Boolean))];
  }

  if (field === 'uhid') {
    const page = await listRegistrations({ page: 1, limit: 100, uhid: trimmed });
    return [...new Set(page.data.map((row) => row.patient_id).filter(Boolean))];
  }

  if (field === 'abha_number') {
    const page = await listRegistrations({
      page: 1,
      limit: 100,
      abha_number: normalizeAbhaForSearch(trimmed),
    });
    return [...new Set(page.data.map((row) => row.patient_id).filter(Boolean))];
  }

  if (field === 'abha_address') {
    const page = await listRegistrations({ page: 1, limit: 100, abha_address: trimmed });
    return [...new Set(page.data.map((row) => row.patient_id).filter(Boolean))];
  }

  return [];
}

async function resolvePatientIdsForSearch(
  field: HistoricalSearchField,
  query: string,
): Promise<string[]> {
  const empiPatients = await searchEmpiByField(field, query);
  const patientIds = new Set(empiPatients.map((patient) => patient.id));

  if (
    field === 'patient_name' ||
    field === 'mobile_number' ||
    field === 'uhid' ||
    field === 'abha_number' ||
    field === 'abha_address'
  ) {
    const registrationIds = await searchRegistrationPatientIds(field, query).catch(() => []);
    for (const patientId of registrationIds) {
      patientIds.add(patientId);
    }
  }

  return [...patientIds];
}

async function fetchVisitsForPatients(
  patientIds: string[],
  dateFilters?: { updated_from?: string; updated_to?: string },
): Promise<RegistrationVisitResponse[]> {
  if (patientIds.length === 0) return [];

  const results = await Promise.all(
    patientIds.map(async (patientId) => {
      const page = await listRegistrationVisits({
        patient_id: patientId,
        page: 1,
        limit: SEARCH_VISITS_PER_PATIENT_LIMIT,
        ...dateFilters,
      });
      return page.data;
    }),
  );
  return results.flat();
}

function visitDateFilters(filters: HistoricalRecordsFilters): {
  updated_from?: string;
  updated_to?: string;
} {
  return {
    ...(filters.startDate ? { updated_from: filters.startDate } : {}),
    ...(filters.endDate ? { updated_to: filters.endDate } : {}),
  };
}

function isHistoricalSearchActive(filters: HistoricalRecordsFilters): boolean {
  return isHistoricalSearchQueryValid(filters.searchField, filters.search);
}

function mapVisitToRow(
  visit: RegistrationVisitResponse,
  empi: EmpiPatient | undefined,
  doctorLookup: Map<string, string>,
  registrationSnapshot?: RegistrationPatientSnapshot | null,
): HistoricalRecordRow {
  const age = empi ? empiPatientAgeYears(empi) : 0;
  const gender = empi?.gender ?? 'other';

  return {
    id: visit.id,
    patientId: visit.patient_id,
    patientName: empi?.full_name?.trim() || registrationSnapshot?.fullName?.trim() || '—',
    age,
    gender: gender === 'male' || gender === 'female' ? gender : 'other',
    abhaNumber: resolvePatientAbhaNumber(empi?.abha_number, registrationSnapshot),
    uhid: empi?.uhid?.trim() || registrationSnapshot?.uhid?.trim() || '—',
    mobileNumber:
      empi?.phone_number?.trim() || registrationSnapshot?.phoneNumber?.trim() || '—',
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
  const dateFilters = visitDateFilters(filters);

  const doctorLookup = await fetchDoctorLookupMap();

  if (isHistoricalSearchActive(filters)) {
    const patientIds = await resolvePatientIdsForSearch(filters.searchField, search);
    const [visits, registrationByPatientId, empiById] = await Promise.all([
      fetchVisitsForPatients(patientIds, dateFilters),
      fetchRegistrationSnapshotByPatientIds(patientIds),
      fetchEmpiPatientLookupMap(patientIds),
    ]);

    const items = visits
      .map((v) =>
        mapVisitToRow(
          v,
          empiById.get(v.patient_id),
          doctorLookup,
          registrationByPatientId.get(v.patient_id),
        ),
      )
      .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));

    const total = items.length;
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), total };
  }

  const visitPage = await listRegistrationVisits({ page, limit, ...dateFilters });
  const patientIds = visitPage.data.map((v) => v.patient_id);
  const [empiById, registrationByPatientId] = await Promise.all([
    fetchEmpiPatientLookupMap(patientIds),
    fetchRegistrationSnapshotByPatientIds(patientIds),
  ]);

  const items = visitPage.data.map((v) =>
    mapVisitToRow(v, empiById.get(v.patient_id), doctorLookup, registrationByPatientId.get(v.patient_id)),
  );

  return { items, total: visitPage.total };
}

const NOT_PROVIDED = 'Not provided';

/** EMPI mapper uses '-' / 'N/A' as its "missing" sentinels; the profile uses 'Not provided'. */
function orNotProvided(value: string, missingSentinel: '-' | 'N/A'): string {
  return value === missingSentinel ? NOT_PROVIDED : value;
}

/** Prefer the EMPI value, fall back to the registration snapshot, then to 'Not provided'. */
function resolveAbhaField(empiValue: string, snapshotValue: string | undefined): string {
  if (empiValue !== 'N/A') return empiValue;
  const fromSnapshot = snapshotValue?.trim();
  const resolved = fromSnapshot ? fromSnapshot : NOT_PROVIDED;
  // Mirror the original's trailing 'N/A' guard in case a snapshot value is itself the sentinel.
  return resolved === 'N/A' ? NOT_PROVIDED : resolved;
}

export async function fetchHistoricalPatientProfile(
  patientId: string,
): Promise<HistoricalPatientProfile> {
  const [detail, visitPage, registrationByPatientId] = await Promise.all([
    fetchEmpiPatientDetail(patientId),
    listRegistrationVisits({ patient_id: patientId, page: 1, limit: 1 }),
    fetchRegistrationSnapshotByPatientIds([patientId]),
  ]);

  const mapped = mapEmpiPatientToOpdDetails(detail);
  const snapshot = registrationByPatientId.get(patientId);

  return {
    firstName: orNotProvided(mapped.firstName, '-'),
    middleName: orNotProvided(mapped.middleName, '-'),
    lastName: orNotProvided(mapped.lastName, '-'),
    uhid: mapped.uhid,
    abhaNumber: resolveAbhaField(mapped.abhaNumber, snapshot?.abhaNumber),
    abhaAddress: resolveAbhaField(mapped.abhaAddress, snapshot?.abhaAddress),
    phoneNumber: orNotProvided(mapped.phoneNumber, '-'),
    dateOfBirth: orNotProvided(mapped.dateOfBirth, '-'),
    ageDisplay: mapped.ageDisplay,
    gender: mapped.gender,
    streetAddress: orNotProvided(mapped.streetAddress, '-'),
    district: orNotProvided(mapped.district, '-'),
    state: orNotProvided(mapped.state, '-'),
    pinCode: orNotProvided(mapped.pinCode, '-'),
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

type ReportDateWindow = { startDate?: string; endDate?: string };

type ReportLookups = {
  visitById: Map<string, RegistrationVisitResponse>;
  doctorLookup: Map<string, string>;
};

/** Finalized prescriptions → clinical reports. Mutates `visitsWithClinicalReports` with the visits it covers. */
function collectPrescriptionReports(
  prescriptions: OpdPrescriptionListItem[],
  lookups: ReportLookups,
  window: ReportDateWindow,
  visitsWithClinicalReports: Set<string>,
): HistoricalReportItem[] {
  const reports: HistoricalReportItem[] = [];
  for (const rx of prescriptions) {
    if (rx.status !== 'final') continue;
    const reportTime = rx.finalized_at ?? rx.updated_at ?? rx.created_at;
    if (!isWithinDateRange(reportTime, window.startDate ?? '', window.endDate ?? '')) continue;

    const visit = lookups.visitById.get(rx.visit_id);
    pushClinicalReportsForVisit(reports, {
      visitId: rx.visit_id,
      visitNumber: visit ? formatVisitNumber(visit) : '—',
      doctorName: resolveDoctorName(rx.doctor_id ?? visit?.doctor_id, lookups.doctorLookup),
      reportTime,
      prescriptionId: rx.id,
      viewable: true,
    });
    visitsWithClinicalReports.add(rx.visit_id);
  }
  return reports;
}

/** Visits with a finalized OPD overlay but no prescription report → clinical reports. Mutates `visitsWithClinicalReports`. */
function collectOverlayReports(
  visits: RegistrationVisitResponse[],
  overlayByVisitId: Awaited<ReturnType<typeof fetchOpdEncounterOverlaysByVisitIds>>,
  lookups: ReportLookups,
  window: ReportDateWindow,
  visitsWithClinicalReports: Set<string>,
): HistoricalReportItem[] {
  const reports: HistoricalReportItem[] = [];
  for (const visit of visits) {
    if (visitsWithClinicalReports.has(visit.id)) continue;
    const overlay = overlayByVisitId.get(visit.id);
    if (!overlay || overlay.prescriptionStatus !== 'final') continue;

    const reportTime = visit.updated_at ?? visit.created_at;
    if (!isWithinDateRange(reportTime, window.startDate ?? '', window.endDate ?? '')) continue;

    pushClinicalReportsForVisit(reports, {
      visitId: visit.id,
      visitNumber: formatVisitNumber(visit),
      doctorName: resolveDoctorName(visit.doctor_id, lookups.doctorLookup),
      reportTime,
      viewable: true,
    });
    visitsWithClinicalReports.add(visit.id);
  }
  return reports;
}

/** Health documents of report-eligible HI types → report items. */
function collectHealthDocReports(
  healthDocs: Awaited<ReturnType<typeof fetchPatientHealthDocuments>>['data'],
  lookups: ReportLookups,
  window: ReportDateWindow,
): HistoricalReportItem[] {
  const reports: HistoricalReportItem[] = [];
  for (const doc of healthDocs) {
    if (!REPORT_HI_TYPES.includes(doc.hi_type as HistoricalReportHiType)) continue;
    if (!isWithinDateRange(doc.uploaded_at, window.startDate ?? '', window.endDate ?? '')) continue;

    const visit = doc.visit_id ? lookups.visitById.get(doc.visit_id) : undefined;
    reports.push({
      id: `doc-${doc.id}`,
      title: doc.document_title,
      hiType: doc.hi_type as HistoricalReportHiType,
      visitNumber: visit ? formatVisitNumber(visit) : '—',
      doctorName: resolveDoctorName(visit?.doctor_id, lookups.doctorLookup),
      reportTime: doc.uploaded_at,
      source: 'health_document',
      documentId: doc.id,
      visitId: doc.visit_id ?? undefined,
      downloadUrl: doc.download_url,
      fileName: doc.file_name,
      fileType: doc.file_type,
    });
  }
  return reports;
}

function reportMatchesFilters(
  report: HistoricalReportItem,
  options: { hiType?: string; reportCategory?: string } | undefined,
  search: string,
): boolean {
  if (options?.hiType && options.hiType !== 'all' && report.hiType !== options.hiType) return false;
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

  const lookups: ReportLookups = {
    visitById: new Map(visitPage.data.map((v) => [v.id, v])),
    doctorLookup,
  };
  const overlayByVisitId = await fetchOpdEncounterOverlaysByVisitIds(
    visitPage.data.map((v) => v.id),
  );
  const search = options?.search?.trim().toLowerCase() ?? '';
  const visitsWithClinicalReports = new Set<string>();

  const reports = [
    ...collectPrescriptionReports(prescriptions, lookups, options ?? {}, visitsWithClinicalReports),
    ...collectOverlayReports(
      visitPage.data,
      overlayByVisitId,
      lookups,
      options ?? {},
      visitsWithClinicalReports,
    ),
    ...collectHealthDocReports(healthDocs.data, lookups, options ?? {}),
  ];

  return reports
    .filter((report) => reportMatchesFilters(report, options, search))
    .sort((a, b) => b.reportTime.localeCompare(a.reportTime));
}

export { REPORT_HI_TYPES };
