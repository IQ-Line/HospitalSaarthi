import type { DispenseReturnDetail, DispenseReturnSummary } from "../domain/pharmacy.types.js";
import type { DispenseReturnRepo, UserLookupPort } from "../ports.js";

export class DispenseReturnNotFoundError extends Error {
  constructor() {
    super("Return not found");
    this.name = "DispenseReturnNotFoundError";
  }
}

export type ListDispenseReturnsInput = {
  page?: number;
  limit?: number;
  q?: string;
};

export type ListDispenseReturnsResult = {
  items: DispenseReturnSummary[];
  total: number;
  page: number;
  limit: number;
};

export async function listDispenseReturns(
  deps: { dispenseReturnRepo: DispenseReturnRepo },
  tenantId: string,
  input: ListDispenseReturnsInput,
): Promise<ListDispenseReturnsResult> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const result = await deps.dispenseReturnRepo.listReturns(tenantId, {
    page,
    limit,
    search: input.q,
  });
  return { ...result, page, limit };
}

export async function getDispenseReturn(
  deps: { dispenseReturnRepo: DispenseReturnRepo; userLookup: UserLookupPort },
  tenantId: string,
  returnId: string,
): Promise<DispenseReturnDetail> {
  const detail = await deps.dispenseReturnRepo.findReturnById(tenantId, returnId);
  if (!detail) {
    throw new DispenseReturnNotFoundError();
  }

  if (detail.processed_by) {
    const names = await deps.userLookup.resolveDoctorNames(tenantId, [detail.processed_by]);
    return {
      ...detail,
      processed_by_name: names.get(detail.processed_by) ?? null,
    };
  }

  return detail;
}
