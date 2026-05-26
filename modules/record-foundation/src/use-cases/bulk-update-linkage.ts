import type { CareContextRepo } from "../ports.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export interface BulkUpdateLinkageInput {
  tenantId: string;
  updates: Array<{
    careContextId: string;
    abdmReferenceNumber: string;
    linkedAt?: string;
  }>;
}

export interface BulkUpdateLinkageResult {
  updatedCount: number;
  skipped: Array<{
    careContextId: string;
    reason: string;
  }>;
}

export async function bulkUpdateLinkage(
  deps: Deps,
  input: BulkUpdateLinkageInput,
): Promise<BulkUpdateLinkageResult> {
  const skipped: Array<{ careContextId: string; reason: string }> = [];

  const validUpdates = input.updates.filter((u) => {
    if (!u.careContextId) {
      skipped.push({
        careContextId: u.careContextId,
        reason: "missing_care_context_id",
      });
      return false;
    }
    return true;
  });

  const updatedCount = await deps.careContextRepo.bulkUpdateLinkage(
    input.tenantId,
    validUpdates.map((u) => ({
      careContextId: u.careContextId,
      abhaLinkageStatus: "linked",
      abdmReferenceNumber: u.abdmReferenceNumber,
      linkedAt: u.linkedAt,
    })),
  );

  return { updatedCount, skipped };
}
