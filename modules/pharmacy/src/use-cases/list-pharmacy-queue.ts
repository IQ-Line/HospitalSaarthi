import type { PharmacyQueueItem } from "../domain/pharmacy.types.js";
import type { OpdQueueProjectionRepo, WalkInDispenseRepo } from "../ports.js";
import { mapOpdQueueProjectionToQueueItem } from "../lib/map-opd-queue-projection.js";
import {
  normalizePharmacyQueueSearch,
  normalizePharmacyQueueStatus,
  type PharmacyQueueStatusFilter,
} from "../lib/pharmacy-queue-filter.js";
import {
  ageYearsFromDateOfBirth,
  walkInPatientDisplayName,
} from "../lib/walk-in-patient-display.js";
import {
  hasPharmacyDispenseRecord,
} from "../lib/dispense-completion.js";
import type { WalkInQueueSummary } from "../domain/pharmacy.types.js";

export type PharmacyQueueKind = "opd" | "walk_in";

export type ListPharmacyQueueInput = {
  kind?: PharmacyQueueKind | string | null;
  page?: number;
  limit?: number;
  queued_from?: string;
  queued_to?: string;
  q?: string | null;
  status?: string | null;
};

export type ListPharmacyQueueResult = {
  items: PharmacyQueueItem[];
  total: number;
  page: number;
  limit: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function clampPage(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 1;
  return Math.max(1, Math.floor(raw));
}

function clampLimit(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(raw)), MAX_LIMIT);
}

function normalizeQueueKind(raw: string | null | undefined): PharmacyQueueKind {
  return raw === "walk_in" ? "walk_in" : "opd";
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
    formatted_visit_id: null,
    has_dispense: hasPharmacyDispenseRecord(row.dispense_status),
    dispense_status: row.dispense_status,
  }));
}

async function listOpdPharmacyQueue(
  deps: {
    opdQueueProjectionRepo: OpdQueueProjectionRepo;
  },
  tenantId: string,
  input: {
    page: number;
    limit: number;
    queued_from?: string;
    queued_to?: string;
    search: string;
    status: PharmacyQueueStatusFilter;
  },
): Promise<ListPharmacyQueueResult> {
  const result = await deps.opdQueueProjectionRepo.listForQueue(tenantId, {
    page: input.page,
    limit: input.limit,
    queued_from: input.queued_from,
    queued_to: input.queued_to,
    search: input.search,
    status: input.status,
  });

  return {
    items: result.items.map(mapOpdQueueProjectionToQueueItem),
    total: result.total,
    page: input.page,
    limit: input.limit,
  };
}

async function listWalkInPharmacyQueue(
  deps: { walkInDispenseRepo: WalkInDispenseRepo },
  tenantId: string,
  input: {
    page: number;
    limit: number;
    queued_from?: string;
    queued_to?: string;
    search: string;
    status: PharmacyQueueStatusFilter;
  },
): Promise<ListPharmacyQueueResult> {
  const result = await deps.walkInDispenseRepo.listForQueue(tenantId, {
    page: input.page,
    limit: input.limit,
    queued_from: input.queued_from,
    queued_to: input.queued_to,
    search: input.search,
    status: input.status,
  });

  return {
    items: mapWalkInRows(result.items),
    total: result.total,
    page: input.page,
    limit: input.limit,
  };
}

export async function listPharmacyQueue(
  deps: {
    walkInDispenseRepo: WalkInDispenseRepo;
    opdQueueProjectionRepo: OpdQueueProjectionRepo;
  },
  tenantId: string,
  input: ListPharmacyQueueInput = {},
): Promise<ListPharmacyQueueResult> {
  const page = clampPage(input.page);
  const limit = clampLimit(input.limit);
  const kind = normalizeQueueKind(input.kind);
  const search = normalizePharmacyQueueSearch(input.q);
  const status = normalizePharmacyQueueStatus(input.status);
  const queueInput = {
    page,
    limit,
    queued_from: input.queued_from,
    queued_to: input.queued_to,
    search,
    status,
  };

  if (kind === "walk_in") {
    return listWalkInPharmacyQueue(deps, tenantId, queueInput);
  }

  return listOpdPharmacyQueue(deps, tenantId, queueInput);
}
