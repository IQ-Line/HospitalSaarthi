import type { PharmacyQueueItem } from "../domain/pharmacy.types.js";
import type { QueueProjectionRepo } from "../ports.js";
import { mapQueueProjectionToQueueItem } from "../lib/map-queue-projection.js";
import {
  normalizePharmacyQueueSearch,
  normalizePharmacyQueueStatus,
  type PharmacyQueueStatusFilter,
} from "../lib/pharmacy-queue-filter.js";

export type PharmacyQueueKind = "opd";

export type ListPharmacyQueueInput = {
  kind?: PharmacyQueueKind | string | null;
  page?: number;
  limit?: number;
  queued_from?: string;
  queued_to?: string;
  q?: string | null;
  status?: string | null;
  doctor_id?: string | null;
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

function normalizeQueueKind(_raw: string | null | undefined): PharmacyQueueKind {
  return "opd";
}

async function listOpdPharmacyQueue(
  deps: {
    queueProjectionRepo: QueueProjectionRepo;
  },
  tenantId: string,
  input: {
    page: number;
    limit: number;
    queued_from?: string;
    queued_to?: string;
    search: string;
    status: PharmacyQueueStatusFilter;
    doctor_id?: string;
  },
): Promise<ListPharmacyQueueResult> {
  const result = await deps.queueProjectionRepo.listForQueue(tenantId, {
    page: input.page,
    limit: input.limit,
    queued_from: input.queued_from,
    queued_to: input.queued_to,
    search: input.search,
    status: input.status,
    doctor_id: input.doctor_id,
    source_kind: "opd",
  });

  return {
    items: result.items.map(mapQueueProjectionToQueueItem),
    total: result.total,
    page: input.page,
    limit: input.limit,
  };
}

export async function listPharmacyQueue(
  deps: {
    queueProjectionRepo: QueueProjectionRepo;
  },
  tenantId: string,
  input: ListPharmacyQueueInput = {},
): Promise<ListPharmacyQueueResult> {
  const page = clampPage(input.page);
  const limit = clampLimit(input.limit);
  normalizeQueueKind(input.kind);
  const search = normalizePharmacyQueueSearch(input.q);
  const status = normalizePharmacyQueueStatus(input.status);
  const doctorId = input.doctor_id?.trim() || undefined;
  const queueInput = {
    page,
    limit,
    queued_from: input.queued_from,
    queued_to: input.queued_to,
    search,
    status,
    doctor_id: doctorId,
  };

  return listOpdPharmacyQueue(deps, tenantId, queueInput);
}
