import type { CareContextRepo } from "../ports.js";
import type { CareContext } from "../domain/care-context.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export interface UpdateLinkageInput {
  tenantId: string;
  careContextId: string;
  abhaLinkageStatus: string;
  abdmReferenceNumber?: string;
  linkedAt?: string;
}

export async function updateCareContextLinkage(
  deps: Deps,
  input: UpdateLinkageInput,
): Promise<CareContext | null> {
  return deps.careContextRepo.updateLinkage(
    input.tenantId,
    input.careContextId,
    input.abhaLinkageStatus,
    input.abdmReferenceNumber,
    input.linkedAt,
  );
}
