import type { PatientRepo } from "../ports.js";
import type { Patient, PatientFilters } from "../domain/patient.types.js";
import { PatientSearchQueryError } from "../errors.js";

interface Deps {
  patientRepo: PatientRepo;
}

export const DEFAULT_PATIENT_SEARCH_LIMIT = 20;
export const MAX_PATIENT_SEARCH_LIMIT = 100;

export interface PatientSearchPage {
  data: Patient[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

function hasPrimarySearchInput(filters: PatientFilters): boolean {
  const name = filters.name?.trim();
  if (name && name.length >= 2) return true;
  if (filters.uhid?.trim()) return true;
  if (filters.abha_number?.trim()) return true;
  if (filters.phone_any?.trim()) return true;
  return false;
}

export async function searchPatients(
  deps: Deps,
  tenantId: string,
  filters: PatientFilters,
): Promise<PatientSearchPage> {
  const name = filters.name?.trim();
  if (name !== undefined && name.length === 1) {
    throw new PatientSearchQueryError(
      "name must be at least 2 characters for a substring search.",
    );
  }

  if (!hasPrimarySearchInput(filters)) {
    throw new PatientSearchQueryError(
      "Provide at least one of: uhid, phone, mobile, abha_number, or name (minimum 2 characters).",
    );
  }

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(
    MAX_PATIENT_SEARCH_LIMIT,
    Math.max(1, filters.limit ?? DEFAULT_PATIENT_SEARCH_LIMIT),
  );

  const normalized: PatientFilters = {
    ...filters,
    page,
    limit,
    name: name && name.length >= 2 ? name : undefined,
    uhid: filters.uhid?.trim() || undefined,
    abha_number: filters.abha_number?.trim() || undefined,
    phone_any: filters.phone_any?.trim() || undefined,
  };

  const { data, total } = await deps.patientRepo.findAll(tenantId, normalized);
  const total_pages =
    total === 0 ? 0 : Math.ceil(total / limit);
  return { data, total, page, limit, total_pages };
}
