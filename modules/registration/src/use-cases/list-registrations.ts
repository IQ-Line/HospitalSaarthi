import type { RegistrationRepo, VisitRepo } from "../ports.js";
import type {
  ListRegistrationsParams,
  RegistrationListPage,
  RegistrationWithVisitRecord,
} from "../domain/registration.types.js";

function totalPages(total: number, limit: number): number {
  if (total === 0) return 0;
  return Math.ceil(total / limit);
}

/** Local query only — no EMPI calls (ADR-0029 snapshot model). */
export async function listRegistrations(
  deps: { registrationRepo: RegistrationRepo; visitRepo: VisitRepo },
  tenantId: string,
  params: ListRegistrationsParams,
): Promise<RegistrationListPage> {
  const q = params.q?.trim();
  const hasLegacy = !!(
    params.uhid?.trim() ||
    params.mobile?.trim() ||
    params.name?.trim() ||
    params.abha_number?.trim() ||
    params.abha_address?.trim()
  );
  if (q && hasLegacy) {
    throw new Error("list_search_params_conflict");
  }

  const name = params.name?.trim();
  if (name && name.length > 0 && name.length < 2) {
    throw new Error("name_search_too_short");
  }

  const { rows, total } = await deps.registrationRepo.listPage(tenantId, params);
  const visitsByPatient = await deps.visitRepo.findLatestByPatientIds(
    tenantId,
    rows.map((row) => row.patient_id),
  );

  const data: RegistrationWithVisitRecord[] = rows.map((registration) => ({
    registration,
    visit: visitsByPatient.get(registration.patient_id) ?? null,
  }));

  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    total_pages: totalPages(total, params.limit),
  };
}
