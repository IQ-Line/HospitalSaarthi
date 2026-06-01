import { createTariffService } from '../api/tariff-client';
import type { ServiceBulkCreateResponse } from '../types';

/** Master Data picklist value — matches `resolve-registration-tariff`. */
const CONSULTATION_FEE_CATEGORY = 'consultation-fee';

export type DoctorTariffRow = {
  department_id: string;
  base_price: number;
  tax_percentage: number;
};

type DepartmentRef = { id: string; name: string; code: string };

function sanitizeCodeSegment(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'DEPT';
}

export async function createDoctorConsultationTariffs(
  providerId: string,
  providerName: string,
  rows: DoctorTariffRow[],
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

  return createTariffService(
    {
      provider_id: providerId,
      service_name: `${providerName.trim()} Consultation`,
      category: CONSULTATION_FEE_CATEGORY,
      department_tariffs,
    },
    iqTenantId,
  ) as Promise<ServiceBulkCreateResponse>;
}
