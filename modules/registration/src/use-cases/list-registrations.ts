import type { EmpiHttpPort, RegistrationRepo } from "../ports.js";
import type {
  ListRegistrationsParams,
  RegistrationListItem,
  RegistrationListPage,
} from "../domain/registration.types.js";

function totalPages(total: number, limit: number): number {
  if (total === 0) return 0;
  return Math.ceil(total / limit);
}

export async function listRegistrations(
  deps: {
    registrationRepo: RegistrationRepo;
    empiGateway?: EmpiHttpPort;
  },
  tenantId: string,
  params: ListRegistrationsParams,
): Promise<RegistrationListPage> {
  const uhid = params.uhid?.trim();
  const mobile = params.mobile?.trim();
  const name = params.name?.trim();

  let patientIds: string[] | undefined;

  if (uhid || mobile || name) {
    if (!deps.empiGateway) {
      throw new Error("empi_gateway_required_for_search");
    }
    if (name && name.length < 2) {
      throw new Error("name_search_too_short");
    }
    patientIds = await deps.empiGateway.searchPatientIds(tenantId, {
      uhid: uhid || undefined,
      mobile: mobile || undefined,
      name: name || undefined,
    });
    if (patientIds.length === 0) {
      return {
        data: [],
        total: 0,
        page: params.page,
        limit: params.limit,
        total_pages: 0,
      };
    }
  }

  const { rows, total } = await deps.registrationRepo.listPage(tenantId, {
    ...params,
    patientIds,
  });

  const summaries = new Map<
    string,
    { uhid: string; full_name: string; phone_number: string }
  >();

  if (deps.empiGateway) {
    await Promise.all(
      [...new Set(rows.map((r) => r.patient_id))].map(async (pid) => {
        try {
          const s = await deps.empiGateway!.getPatientSummary(tenantId, pid);
          if (s) summaries.set(pid, s);
        } catch {
          // EMPI down or unreachable — return registration rows without patient snapshot.
        }
      }),
    );
  }

  const data: RegistrationListItem[] = rows.map((r) => {
    const s = summaries.get(r.patient_id);
    return {
      ...r,
      patient_uhid: s?.uhid ?? null,
      patient_full_name: s?.full_name ?? null,
      patient_phone_number: s?.phone_number ?? null,
    };
  });

  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    total_pages: totalPages(total, params.limit),
  };
}
