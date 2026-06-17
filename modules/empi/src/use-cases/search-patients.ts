import type { PatientRepo } from "../ports.js";
import type { Patient, PatientFilters } from "../domain/patient.types.js";
import { normalizeAbhaNumberForEmpi } from "../lib/abha-number.js";
import { normalizeIndianPhoneForEmpi } from "../lib/indian-phone.js";

interface Deps {
  patientRepo: PatientRepo;
}

function normalizeSearchFilters(filters: PatientFilters): PatientFilters {
  const phone = filters.phone_number?.trim();
  const abha = filters.abha_number?.trim();

  return {
    ...filters,
    phone_number: phone ? normalizeIndianPhoneForEmpi(phone) ?? phone : undefined,
    abha_number: abha ? normalizeAbhaNumberForEmpi(abha) ?? abha : undefined,
  };
}

export async function searchPatients(
  deps: Deps,
  tenantId: string,
  filters: PatientFilters,
): Promise<{ data: Patient[]; total: number }> {
  return deps.patientRepo.findAll(tenantId, normalizeSearchFilters(filters));
}
