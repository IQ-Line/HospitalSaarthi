import type { ExternalHealthRecordRepo } from "../ports.js";
import type { ExternalHealthRecord } from "../domain/external-record.js";

interface Deps {
  externalHealthRecordRepo: ExternalHealthRecordRepo;
}

export async function markExternalRecordViewed(
  deps: Deps,
  tenantId: string,
  id: string,
): Promise<ExternalHealthRecord | null> {
  return deps.externalHealthRecordRepo.markViewed(
    tenantId,
    id,
    new Date().toISOString(),
  );
}
