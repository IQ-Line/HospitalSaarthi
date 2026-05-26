import type { CareContextRepo } from "../ports.js";
import type {
  CareContext,
  CreateCareContextData,
} from "../domain/care-context.js";

interface Deps {
  careContextRepo: CareContextRepo;
}

export async function createCareContext(
  deps: Deps,
  data: CreateCareContextData,
): Promise<CareContext> {
  return deps.careContextRepo.create(data);
}
