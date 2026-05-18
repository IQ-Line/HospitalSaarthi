import type { RegistrationRepo } from "../ports.js";
import type { ListRegistrationsParams, RegistrationListPage } from "../domain/registration.types.js";

function totalPages(total: number, limit: number): number {
  if (total === 0) return 0;
  return Math.ceil(total / limit);
}

/** Local query only — no EMPI calls (ADR-0029 snapshot model). */
export async function listRegistrations(
  deps: { registrationRepo: RegistrationRepo },
  tenantId: string,
  params: ListRegistrationsParams,
): Promise<RegistrationListPage> {
  const name = params.name?.trim();
  if (name && name.length > 0 && name.length < 2) {
    throw new Error("name_search_too_short");
  }

  const { rows, total } = await deps.registrationRepo.listPage(tenantId, params);

  return {
    data: rows,
    total,
    page: params.page,
    limit: params.limit,
    total_pages: totalPages(total, params.limit),
  };
}
