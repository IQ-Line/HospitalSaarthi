import type { ExternalHealthRecordRepo } from "../ports.js";
import type { ExternalHealthRecord } from "../domain/external-record.js";

interface Deps {
  externalHealthRecordRepo: ExternalHealthRecordRepo;
}

export async function listExternalRecords(
  deps: Deps,
  tenantId: string,
  patientId: string,
): Promise<ExternalHealthRecord[]> {
  return deps.externalHealthRecordRepo.findByPatient(tenantId, patientId);
}
