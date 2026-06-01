import {
  billingIqTenantHeaderValue,
  catalogIqTenantHeaderValue,
} from '@/lib/catalog-tenant';
import { apiClient, apiClientWithIqTenant } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const BILLING_BASE = '/api/billing/v1';

export type ConsultationType = {
  id: string;
  code: string;
  display_name: string;
};

export type ConsultationTypesListResponse = {
  data: ConsultationType[];
};

export type ProviderConsultationTariffUpsertItem = {
  department_id: string;
  consultation_type_id: string;
  base_price: string | number;
  tax_percentage?: string | number;
};

export type BulkUpsertProviderConsultationTariffsBody = {
  provider_id: string;
  items: ProviderConsultationTariffUpsertItem[];
};

export type ProviderConsultationTariff = {
  id: string;
  provider_id: string | null;
  department_id: string | null;
  consultation_type_id: string | null;
  service_code: string;
  service_name: string;
  department: string | null;
  base_price: string;
  tax_percentage: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
};

export type ProviderConsultationTariffListResponse = {
  data: ProviderConsultationTariff[];
};

export type ListProviderConsultationTariffsParams = {
  provider_id?: string;
  department_id?: string;
  consultation_type_id?: string;
};

function resolveBillingTenantId(explicit?: string): string {
  if (explicit) {
    const fromExplicit = catalogIqTenantHeaderValue(explicit);
    if (fromExplicit) return fromExplicit;
  }
  return billingIqTenantHeaderValue(
    useTenantStore.getState().tenantId,
    useAuthStore.getState().accessToken,
  );
}

function billingFetch<T>(
  iqTenantId: string | undefined,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const tid = resolveBillingTenantId(iqTenantId);
  if (iqTenantId) {
    return apiClientWithIqTenant<T>(tid, path, options);
  }
  return apiClient<T>(path, options);
}

export function listConsultationTypes(iqTenantId?: string): Promise<ConsultationTypesListResponse> {
  return billingFetch<ConsultationTypesListResponse>(iqTenantId, `${BILLING_BASE}/consultation-types`);
}

export function listProviderConsultationTariffs(
  params: ListProviderConsultationTariffsParams,
  iqTenantId?: string,
): Promise<ProviderConsultationTariffListResponse> {
  const sp = new URLSearchParams();
  if (params.provider_id) sp.set('provider_id', params.provider_id);
  if (params.department_id) sp.set('department_id', params.department_id);
  if (params.consultation_type_id) sp.set('consultation_type_id', params.consultation_type_id);
  const qs = sp.toString();
  return billingFetch<ProviderConsultationTariffListResponse>(
    iqTenantId,
    `${BILLING_BASE}/provider-consultation-tariffs${qs ? `?${qs}` : ''}`,
  );
}

export function bulkUpsertProviderConsultationTariffs(
  body: BulkUpsertProviderConsultationTariffsBody,
  iqTenantId?: string,
): Promise<{ data: unknown[] }> {
  return billingFetch<{ data: unknown[] }>(
    iqTenantId,
    `${BILLING_BASE}/provider-consultation-tariffs/bulk-upsert`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}
