import { DEV_TENANT_IQ_CATALOG_UUID } from '@/lib/catalog-tenant';
import { formatMoneyApi } from '../lib/format';
import type {
  ServiceCreateInput,
  ServiceSingleResponse,
  ServicesListParams,
  ServicesListResponse,
  ServiceUpdateInput,
  TariffService,
} from '../types';

const MOCK_TS = '2026-05-15T00:00:00.000Z';
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

type Seed = Pick<
  TariffService,
  | 'id'
  | 'service_code'
  | 'service_name'
  | 'department'
  | 'category'
  | 'tax_type'
  | 'base_price'
> &
  Partial<Pick<TariffService, 'description' | 'provider_id'>>;

const SEEDS: Seed[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    service_code: 'REG_FEE',
    service_name: 'Registration Fee',
    description: 'First visit registration',
    department: 'frontdesk',
    category: 'registration',
    tax_type: 'EXEMPT',
    base_price: '100.0000',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    service_code: 'CONS_GENERAL',
    service_name: 'General Consultation (rack)',
    department: 'opd',
    category: 'consultation',
    tax_type: 'CGST_SGST',
    base_price: '400.0000',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    service_code: 'CONS_GENERAL',
    service_name: 'General Consultation — Dr Smith',
    provider_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    department: 'opd',
    category: 'consultation',
    tax_type: 'CGST_SGST',
    base_price: '500.0000',
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    service_code: 'PROC_DRESSING',
    service_name: 'Wound Dressing',
    department: 'opd',
    category: 'procedure',
    tax_type: 'CGST_SGST',
    base_price: '200.0000',
  },
];

function toTariffRow(seed: Seed): TariffService {
  return {
    iq_tenant_id: DEV_TENANT_IQ_CATALOG_UUID,
    description: seed.description ?? null,
    provider_id: seed.provider_id ?? null,
    sub_category: null,
    tax_percentage: '0.0000',
    is_active: true,
    effective_from: MOCK_TS,
    effective_to: null,
    created_at: MOCK_TS,
    updated_at: MOCK_TS,
    created_by: null,
    updated_by: null,
    ...seed,
  };
}

function sameProvider(a: string | null, b: string | null): boolean {
  return a === b;
}

function clampLimit(raw: number | undefined): number {
  const n = raw ?? DEFAULT_LIST_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIST_LIMIT);
}

function matchesListFilters(row: TariffService, params: ServicesListParams, tenantId: string): boolean {
  if (row.iq_tenant_id !== tenantId) return false;
  const term = params.q?.trim().toLowerCase();
  if (
    term &&
    !row.service_name.toLowerCase().includes(term) &&
    !row.service_code.toLowerCase().includes(term)
  ) {
    return false;
  }
  const category = params.category?.trim();
  if (category && row.category !== category) return false;
  const department = params.department?.trim();
  if (department && row.department !== department) return false;
  if (params.is_active !== undefined && row.is_active !== params.is_active) return false;
  return true;
}

export class MockTariffStore {
  private rows: TariffService[] = SEEDS.map(toTariffRow);

  list(params: ServicesListParams, tenantId: string): ServicesListResponse {
    const limit = clampLimit(params.limit);
    const data = this.rows
      .filter((row) => matchesListFilters(row, params, tenantId))
      .sort((a, b) => a.service_name.localeCompare(b.service_name));
    const pageRows = data.slice(0, limit);
    const hasMore = data.length > limit;
    const last = pageRows.at(-1);
    return {
      data: pageRows,
      page: {
        limit,
        next_cursor:
          hasMore && last
            ? btoa(JSON.stringify({ service_name: last.service_name, id: last.id }))
            : null,
      },
    };
  }

  create(input: ServiceCreateInput, tenantId: string): ServiceSingleResponse {
    const code = input.service_code.trim();
    const providerId = input.provider_id ?? null;
    if (this.hasDuplicate(tenantId, code, providerId)) {
      throw new Error('Service code already exists for this provider (409 Conflict)');
    }
    const now = new Date().toISOString();
    const row: TariffService = {
      id: crypto.randomUUID(),
      iq_tenant_id: tenantId,
      service_code: code,
      service_name: input.service_name.trim(),
      description: input.description ?? null,
      provider_id: providerId,
      department: input.department ?? null,
      category: input.category ?? null,
      sub_category: input.sub_category ?? null,
      tax_type: input.tax_type ?? null,
      base_price: formatMoneyApi(input.base_price),
      tax_percentage: formatMoneyApi(input.tax_percentage ?? 0),
      is_active: input.is_active ?? true,
      effective_from: input.effective_from ?? now,
      effective_to: input.effective_to ?? null,
      created_at: now,
      updated_at: now,
      created_by: null,
      updated_by: null,
    };
    this.rows.push(row);
    return { data: row };
  }

  update(id: string, input: ServiceUpdateInput): ServiceSingleResponse {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error('Service not found');
    const prev = this.rows[idx]!;
    const next: TariffService = {
      ...prev,
      ...(input.service_name !== undefined && { service_name: input.service_name.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.sub_category !== undefined && { sub_category: input.sub_category }),
      ...(input.tax_type !== undefined && { tax_type: input.tax_type }),
      ...(input.base_price !== undefined && { base_price: formatMoneyApi(input.base_price) }),
      ...(input.tax_percentage !== undefined && {
        tax_percentage: formatMoneyApi(input.tax_percentage),
      }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
      ...(input.effective_from !== undefined && { effective_from: input.effective_from }),
      ...(input.effective_to !== undefined && { effective_to: input.effective_to }),
      updated_at: new Date().toISOString(),
    };
    this.rows[idx] = next;
    return { data: next };
  }

  private hasDuplicate(tenantId: string, code: string, providerId: string | null): boolean {
    return this.rows.some(
      (r) =>
        r.iq_tenant_id === tenantId &&
        r.service_code === code &&
        sameProvider(r.provider_id, providerId),
    );
  }
}

export const mockTariffStore = new MockTariffStore();
