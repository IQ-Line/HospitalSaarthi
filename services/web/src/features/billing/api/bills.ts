import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { billingKeys } from './query-keys';
import type { BillsListParams, BillsListResponse } from '../types';

const BASE = '/api/billing/v1';

function billsQueryString(params: BillsListParams): string {
  const q = new URLSearchParams();
  if (params.patient_id) q.set('patient_id', params.patient_id);
  if (params.visit_id) q.set('visit_id', params.visit_id);
  if (params.source_module) q.set('source_module', params.source_module);
  if (params.source_ref) q.set('source_ref', params.source_ref);
  if (params.status) q.set('status', params.status);
  if (params.bill_type) q.set('bill_type', params.bill_type);
  if (params.from_date) q.set('from_date', params.from_date);
  if (params.to_date) q.set('to_date', params.to_date);
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  if (params.cursor) q.set('cursor', params.cursor);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function listBills(params: BillsListParams = {}): Promise<BillsListResponse> {
  return apiClient<BillsListResponse>(`${BASE}/bills${billsQueryString(params)}`);
}

export function useBills(
  params: BillsListParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: billingKeys.billsList(params),
    queryFn: () => listBills(params),
    enabled: options?.enabled ?? true,
  });
}
