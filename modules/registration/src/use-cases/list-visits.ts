import type { VisitRepo } from "../ports.js";
import type { ListVisitsParams, VisitListPage } from "../domain/visit.types.js";

export async function listVisits(
  deps: { visitRepo: VisitRepo },
  tenantId: string,
  params: ListVisitsParams,
): Promise<VisitListPage> {
  const { rows, total } = await deps.visitRepo.listPage(tenantId, params);
  const limit = params.limit;
  const totalPages = limit === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: rows,
    total,
    page: params.page,
    limit,
    total_pages: totalPages,
  };
}
