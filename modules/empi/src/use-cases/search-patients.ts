import type { PatientRepo } from "../ports.js";
import type { Patient, PatientFilters } from "../domain/patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
}

export async function searchPatients(
  deps: Deps,
  tenantId: string,
  filters: PatientFilters,
): Promise<{ data: Patient[]; total: number }> {
  return deps.patientRepo.findAll(tenantId, filters);
}
