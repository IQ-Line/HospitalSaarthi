import type { OpdCompletedVisitSummary, PharmacyQueueItem, WalkInQueueSummary } from "../domain/pharmacy.types.js";
import type {
  DispenseRecordRepo,
  EmpiGatewayPort,
  OpdGatewayPort,
  UserLookupPort,
  WalkInDispenseRepo,
} from "../ports.js";
import { mapEmpiPayloadToQueuePatientFields } from "../lib/empi-patient-summary.js";
import {
  matchesPharmacyQueueSearch,
  matchesPharmacyQueueStatus,
  normalizePharmacyQueueSearch,
  normalizePharmacyQueueStatus,
} from "../lib/pharmacy-queue-filter.js";
import {
  ageYearsFromDateOfBirth,
  walkInPatientDisplayName,
} from "../lib/walk-in-patient-display.js";

export type ListPharmacyQueueInput = {
  page?: number;
  limit?: number;
  queued_from?: string;
  queued_to?: string;
  q?: string | null;
  status?: string | null;
  bearerToken?: string;
};

export type ListPharmacyQueueResult = {
  items: PharmacyQueueItem[];
  total: number;
  page: number;
  limit: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const OPD_SCAN_PAGE_SIZE = 100;

function clampPage(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 1;
  return Math.max(1, Math.floor(raw));
}

function clampLimit(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(raw)), MAX_LIMIT);
}

async function loadPatientFieldsById(
  empiGateway: EmpiGatewayPort,
  tenantId: string,
  patientIds: string[],
  bearerToken?: string,
): Promise<Map<string, ReturnType<typeof mapEmpiPayloadToQueuePatientFields>>> {
  const uniqueIds = [...new Set(patientIds)];
  if (uniqueIds.length === 0) return new Map();

  const results = await Promise.allSettled(
    uniqueIds.map(async (patientId) => {
      const payload = await empiGateway.getPatientSummary(tenantId, patientId, bearerToken);
      return { patientId, fields: mapEmpiPayloadToQueuePatientFields(payload) };
    }),
  );

  const map = new Map<string, ReturnType<typeof mapEmpiPayloadToQueuePatientFields>>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      map.set(result.value.patientId, result.value.fields);
    }
  }
  return map;
}

async function loadDoctorNamesById(
  userLookup: UserLookupPort,
  tenantId: string,
  doctorIds: Array<string | null>,
): Promise<Map<string, string>> {
  const uniqueIds = [
    ...new Set(
      doctorIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  ];
  if (uniqueIds.length === 0) return new Map();
  return userLookup.resolveDoctorNames(tenantId, uniqueIds);
}

function mapWalkInRows(rows: WalkInQueueSummary[]): PharmacyQueueItem[] {
  return rows.map((row) => ({
    walk_in_order: true,
    record_id: row.record_id,
    visit_id: null,
    patient_id: null,
    walk_in_patient_id: row.walk_in_patient_id,
    prescription_id: null,
    doctor_id: null,
    visit_status: "walk_in",
    prescription_status: null,
    updated_at: row.created_at.toISOString(),
    finalized_at: null,
    medicine_count: row.medicine_count,
    patient_name: walkInPatientDisplayName(row.first_name, row.last_name),
    uhid: null,
    phone: row.phone,
    age_years: ageYearsFromDateOfBirth(row.date_of_birth),
    gender: row.gender,
    doctor_name: null,
    has_dispense: row.has_dispense,
  }));
}

async function enrichOpdRows(
  deps: {
    empiGateway: EmpiGatewayPort;
    userLookup: UserLookupPort;
    dispenseRecordRepo: DispenseRecordRepo;
  },
  tenantId: string,
  rows: OpdCompletedVisitSummary[],
  bearerToken?: string,
): Promise<PharmacyQueueItem[]> {
  const visitIds = rows.map((row) => row.visit_id);
  const patientIds = rows.map((row) => row.patient_id);
  const doctorIds = rows.map((row) => row.doctor_id);

  const [records, patientFieldsById, doctorNamesById] = await Promise.all([
    deps.dispenseRecordRepo.listByVisitIds(tenantId, visitIds),
    loadPatientFieldsById(deps.empiGateway, tenantId, patientIds, bearerToken),
    loadDoctorNamesById(deps.userLookup, tenantId, doctorIds),
  ]);

  const hasDispenseByVisit = new Set(records.map((record) => record.visit_id));

  return rows.map((row) => {
    const patientFields = patientFieldsById.get(row.patient_id);
    return {
      walk_in_order: false,
      record_id: null,
      visit_id: row.visit_id,
      patient_id: row.patient_id,
      walk_in_patient_id: null,
      prescription_id: row.prescription_id,
      doctor_id: row.doctor_id,
      visit_status: row.visit_status,
      prescription_status: row.prescription_status,
      updated_at: row.updated_at,
      finalized_at: row.finalized_at,
      medicine_count: row.medicine_count,
      patient_name: patientFields?.patient_name ?? null,
      uhid: patientFields?.uhid ?? null,
      phone: null,
      age_years: patientFields?.age_years ?? null,
      gender: patientFields?.gender ?? null,
      doctor_name:
        row.doctor_id != null ? (doctorNamesById.get(row.doctor_id) ?? null) : null,
      has_dispense: hasDispenseByVisit.has(row.visit_id),
    };
  });
}

async function scanAllOpdCompletedVisits(
  opdGateway: OpdGatewayPort,
  tenantId: string,
  input: {
    queued_from?: string;
    queued_to?: string;
    bearerToken?: string;
  },
): Promise<OpdCompletedVisitSummary[]> {
  const rows: OpdCompletedVisitSummary[] = [];
  let opdPage = 1;
  let opdTotal = Number.POSITIVE_INFINITY;

  while ((opdPage - 1) * OPD_SCAN_PAGE_SIZE < opdTotal) {
    const opd = await opdGateway.listCompletedVisits(tenantId, {
      page: opdPage,
      limit: OPD_SCAN_PAGE_SIZE,
      queued_from: input.queued_from,
      queued_to: input.queued_to,
      bearerToken: input.bearerToken,
    });

    opdTotal = opd.total;
    if (opd.items.length === 0) break;

    rows.push(...opd.items);
    opdPage += 1;
  }

  return rows;
}

async function buildMergedQueueItems(
  deps: {
    opdGateway: OpdGatewayPort;
    empiGateway: EmpiGatewayPort;
    userLookup: UserLookupPort;
    dispenseRecordRepo: DispenseRecordRepo;
    walkInDispenseRepo: WalkInDispenseRepo;
  },
  tenantId: string,
  input: {
    queued_from?: string;
    queued_to?: string;
    bearerToken?: string;
  },
): Promise<PharmacyQueueItem[]> {
  const [walkInRows, opdRows] = await Promise.all([
    deps.walkInDispenseRepo.listForQueue(tenantId, {
      queued_from: input.queued_from,
      queued_to: input.queued_to,
    }),
    scanAllOpdCompletedVisits(deps.opdGateway, tenantId, input),
  ]);

  const walkInItems = mapWalkInRows(walkInRows);
  const opdItems = await enrichOpdRows(deps, tenantId, opdRows, input.bearerToken);

  return [...walkInItems, ...opdItems].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
}

function paginateQueueItems(
  items: PharmacyQueueItem[],
  page: number,
  limit: number,
): ListPharmacyQueueResult {
  const offset = (page - 1) * limit;
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    page,
    limit,
  };
}

export async function listPharmacyQueue(
  deps: {
    opdGateway: OpdGatewayPort;
    empiGateway: EmpiGatewayPort;
    userLookup: UserLookupPort;
    dispenseRecordRepo: DispenseRecordRepo;
    walkInDispenseRepo: WalkInDispenseRepo;
  },
  tenantId: string,
  input: ListPharmacyQueueInput = {},
): Promise<ListPharmacyQueueResult> {
  const page = clampPage(input.page);
  const limit = clampLimit(input.limit);
  const search = normalizePharmacyQueueSearch(input.q);
  const status = normalizePharmacyQueueStatus(input.status);

  const merged = await buildMergedQueueItems(deps, tenantId, {
    queued_from: input.queued_from,
    queued_to: input.queued_to,
    bearerToken: input.bearerToken,
  });

  const filtered = merged.filter(
    (item) =>
      matchesPharmacyQueueSearch(item, search) && matchesPharmacyQueueStatus(item, status),
  );

  return paginateQueueItems(filtered, page, limit);
}
