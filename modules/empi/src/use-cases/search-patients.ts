import type { PatientRepo } from "../ports.js";
import type { Patient, PatientFilters } from "../domain/patient.types.js";
import { normalizeAbhaNumberForEmpi } from "../lib/abha-number.js";
import { normalizeIndianPhoneForEmpi } from "../lib/indian-phone.js";

export const MAX_SEARCH_LIMIT = 100;
export const DEFAULT_SEARCH_LIMIT = 20;
const MIN_NAME_LEN = 2;

export interface PatientSearchPage {
  data: Patient[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export type SearchPatientsResult =
  | { ok: true; page: PatientSearchPage }
  | { ok: false; reason: "no_criteria" };

interface Deps {
  patientRepo: PatientRepo;
}

/**
 * A patient search MUST carry at least one identity criterion (uhid, phone,
 * abha_number, or a name of >=2 chars). Without this guard an empty query
 * falls through to a bare tenant-scoped list — leaking the whole tenant's
 * patient roster. A name shorter than 2 chars does not count as a criterion.
 */
export function hasSearchCriteria(filters: PatientFilters): boolean {
  const name = filters.name?.trim();
  return Boolean(
    filters.uhid?.trim() ||
      filters.phone_number?.trim() ||
      filters.abha_number?.trim() ||
      (name && name.length >= MIN_NAME_LEN),
  );
}

function normalizeSearchFilters(filters: PatientFilters): PatientFilters {
  const phone = filters.phone_number?.trim();
  const abha = filters.abha_number?.trim();
  const name = filters.name?.trim();

  return {
    ...filters,
    // Drop a too-short name so it is never applied as a broad `%x%` scan.
    name: name && name.length >= MIN_NAME_LEN ? name : undefined,
    phone_number: phone ? normalizeIndianPhoneForEmpi(phone) ?? phone : undefined,
    abha_number: abha ? normalizeAbhaNumberForEmpi(abha) ?? abha : undefined,
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit) || limit < 1) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(Math.trunc(limit), MAX_SEARCH_LIMIT);
}

function clampPage(page: number | undefined): number {
  if (page === undefined || !Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.trunc(page);
}

export async function searchPatients(
  deps: Deps,
  tenantId: string,
  filters: PatientFilters,
): Promise<SearchPatientsResult> {
  // The use-case is the safe choke point: no valid criterion => no DB query.
  if (!hasSearchCriteria(filters)) {
    return { ok: false, reason: "no_criteria" };
  }

  const page = clampPage(filters.page);
  const limit = clampLimit(filters.limit);
  const { data, total } = await deps.patientRepo.findAll(tenantId, {
    ...normalizeSearchFilters(filters),
    page,
    limit,
  });

  return {
    ok: true,
    page: {
      data,
      total,
      page,
      limit,
      total_pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
