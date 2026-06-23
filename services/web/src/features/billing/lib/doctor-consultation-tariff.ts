import { isConsultationCategory } from '@/features/frontdesk/lib/resolve-registration-tariff';
import {
  createTariffService,
  listTariffServices,
  updateTariffService,
} from '../api/tariff-client';
import type { ServiceBulkCreateResponse, TariffService } from '../types';
import {
  decodeDoctorTariffDescription,
  encodeDoctorTariffDescription,
} from './doctor-tariff-meta';

/** Master Data picklist value — matches `resolve-registration-tariff`. */
export const CONSULTATION_FEE_CATEGORY = 'consultation-fee';

export function doctorConsultationTariffsQueryKey(
  providerId: string,
  iqTenantId?: string | null,
) {
  return ['doctor-consultation-tariffs', iqTenantId ?? 'active-tenant', providerId] as const;
}

export type DoctorConsultationTariffInput = {
  service_id?: string;
  department_id: string;
  base_price: number;
  tax_percentage: number;
  room_number?: string;
  opd_days?: string[];
};

type DepartmentRef = { id: string; name: string; code: string };

function sanitizeCodeSegment(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'DEPT';
}

function metaDescription(row: DoctorConsultationTariffInput): string | null {
  return encodeDoctorTariffDescription({
    room_number: row.room_number ?? '',
    opd_days: row.opd_days ?? [],
  });
}

export function tariffServiceToDoctorRow(service: TariffService): DoctorConsultationTariffInput {
  const meta = decodeDoctorTariffDescription(service.description);
  return {
    service_id: service.id,
    department_id: service.department_id ?? '',
    base_price: Number(service.base_price) || 0,
    tax_percentage: Number(service.tax_percentage) || 0,
    room_number: meta.room_number,
    opd_days: meta.opd_days,
  };
}

export async function listDoctorConsultationTariffs(
  providerId: string,
  iqTenantId?: string,
): Promise<TariffService[]> {
  const res = await listTariffServices(
    { provider_id: providerId, is_active: true, limit: 50 },
    iqTenantId,
  );
  return (res.data ?? []).filter(
    (row) => row.provider_id === providerId && isConsultationCategory(row.category),
  );
}

async function patchTariffMeta(
  services: TariffService[],
  rows: DoctorConsultationTariffInput[],
  iqTenantId?: string,
): Promise<void> {
  const byDept = new Map(rows.map((r) => [r.department_id, r]));
  await Promise.all(
    services.map(async (svc) => {
      const deptId = svc.department_id;
      if (!deptId) return;
      const row = byDept.get(deptId);
      if (!row) return;
      const description = metaDescription(row);
      if (description === (svc.description ?? null)) return;
      await updateTariffService(svc.id, { description }, iqTenantId);
    }),
  );
}

export async function createDoctorConsultationTariffs(
  providerId: string,
  providerName: string,
  rows: DoctorConsultationTariffInput[],
  departments: DepartmentRef[],
  iqTenantId?: string,
): Promise<ServiceBulkCreateResponse> {
  const byId = new Map(departments.map((d) => [d.id, d]));
  const department_tariffs = rows.map((row) => {
    const dept = byId.get(row.department_id);
    if (!dept) throw new Error('Selected department is no longer available');
    const deptSeg = sanitizeCodeSegment(dept.code || dept.name);
    return {
      department_id: row.department_id,
      base_price: row.base_price,
      tax_percentage: row.tax_percentage,
      service_code: `CONSULT_GEN_${deptSeg}`.slice(0, 64),
      service_name: `${providerName.trim()} — ${dept.name} Consultation`,
    };
  });

  const created = (await createTariffService(
    {
      provider_id: providerId,
      service_name: `${providerName.trim()} Consultation`,
      category: CONSULTATION_FEE_CATEGORY,
      department_tariffs,
    },
    iqTenantId,
  )) as ServiceBulkCreateResponse;

  await patchTariffMeta(created.data ?? [], rows, iqTenantId);
  return created;
}

type ExistingTariffIndex = {
  byId: Map<string, TariffService>;
  byDept: Map<string, TariffService>;
};

function indexExistingTariffs(existing: TariffService[]): ExistingTariffIndex {
  return {
    byId: new Map(existing.map((row) => [row.id, row])),
    byDept: new Map(
      existing
        .filter((row) => row.department_id)
        .map((row) => [row.department_id!, row] as const),
    ),
  };
}

/**
 * Find the existing tariff a form row should update: prefer an explicit
 * service_id match, else fall back to an unclaimed department match.
 */
function matchExistingTariff(
  row: DoctorConsultationTariffInput,
  index: ExistingTariffIndex,
  keptIds: Set<string>,
): TariffService | undefined {
  if (row.service_id && index.byId.has(row.service_id)) {
    return index.byId.get(row.service_id);
  }
  if (row.department_id) {
    const byDept = index.byDept.get(row.department_id);
    if (byDept && !keptIds.has(byDept.id)) return byDept;
  }
  return undefined;
}

function lookupDepartment(
  row: DoctorConsultationTariffInput,
  departments: DepartmentRef[],
): DepartmentRef {
  const dept = departments.find((d) => d.id === row.department_id);
  if (!dept) throw new Error('Selected department is no longer available');
  return dept;
}

async function createMissingTariffs(
  providerId: string,
  providerName: string,
  toCreate: DoctorConsultationTariffInput[],
  departments: DepartmentRef[],
  keptIds: Set<string>,
  iqTenantId?: string,
): Promise<void> {
  if (toCreate.length === 0) return;
  const created = await createDoctorConsultationTariffs(
    providerId,
    providerName,
    toCreate,
    departments,
    iqTenantId,
  );
  for (const svc of created.data ?? []) {
    if (svc.id) keptIds.add(svc.id);
  }
}

async function deactivateRemovedTariffs(
  existing: TariffService[],
  keptIds: Set<string>,
  iqTenantId?: string,
): Promise<void> {
  for (const svc of existing) {
    if (!keptIds.has(svc.id)) {
      await updateTariffService(svc.id, { is_active: false }, iqTenantId);
    }
  }
}

/** Create, update, or deactivate consultation tariffs to match the form. */
export async function syncDoctorConsultationTariffs(
  providerId: string,
  providerName: string,
  rows: DoctorConsultationTariffInput[],
  departments: DepartmentRef[],
  iqTenantId?: string,
): Promise<void> {
  const existing = await listDoctorConsultationTariffs(providerId, iqTenantId);
  const index = indexExistingTariffs(existing);
  const keptIds = new Set<string>();
  const toCreate: DoctorConsultationTariffInput[] = [];

  for (const row of rows) {
    const dept = lookupDepartment(row, departments);
    const existingRow = matchExistingTariff(row, index, keptIds);

    if (!existingRow) {
      toCreate.push(row);
      continue;
    }

    await updateTariffService(
      existingRow.id,
      {
        department_id: row.department_id,
        base_price: row.base_price,
        tax_percentage: row.tax_percentage,
        description: metaDescription(row),
        is_active: true,
        service_name: `${providerName.trim()} — ${dept.name} Consultation`,
      },
      iqTenantId,
    );
    keptIds.add(existingRow.id);
  }

  await createMissingTariffs(providerId, providerName, toCreate, departments, keptIds, iqTenantId);
  await deactivateRemovedTariffs(existing, keptIds, iqTenantId);
}
