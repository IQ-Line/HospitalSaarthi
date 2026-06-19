import type { CareContextRepo, CareContextRow } from "../ports.js";
import type { CreateCareContextData } from "../domain/care-context.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export async function createCareContext(
  deps: Deps,
  tenantId: string,
  data: CreateCareContextData,
): Promise<CareContextRow> {
  const sourceRecordId = data.source_record_id?.trim();
  if (sourceRecordId) {
    const existing = await deps.careContextRepo.findBySourceRecordId(
      tenantId,
      sourceRecordId,
    );
    if (existing) return existing;
  }
  return deps.careContextRepo.insert({ ...data, iqTenantId: tenantId });
}
