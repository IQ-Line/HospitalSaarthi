import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  DispenseReturnDetail,
  DispenseReturnEligibilityResponse,
  DispenseReturnListParams,
  DispenseReturnListResponse,
  DispenseReturnSearchParams,
  DispenseReturnSearchResponse,
  ProcessDispenseReturnInput,
} from '../types/returns-ui.types';
import { pharmacyQueryKeys } from './query-keys';

function buildSearchQuery(params: DispenseReturnSearchParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.bill_number) query.set('bill_number', params.bill_number);
  if (params.dispense_number) query.set('dispense_number', params.dispense_number);
  if (params.prescription_number) query.set('prescription_number', params.prescription_number);
  if (params.uhid) query.set('uhid', params.uhid);
  if (params.patient_name) query.set('patient_name', params.patient_name);
  if (params.mobile) query.set('mobile', params.mobile);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function buildListQuery(params: DispenseReturnListParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export async function searchDispenseForReturn(
  params: DispenseReturnSearchParams,
): Promise<DispenseReturnSearchResponse> {
  return apiClient<DispenseReturnSearchResponse>(
    `/api/pharmacy/v1/dispense-transactions/search${buildSearchQuery(params)}`,
  );
}

export async function fetchDispenseReturnEligibility(
  dispenseId: string,
): Promise<DispenseReturnEligibilityResponse> {
  return apiClient<DispenseReturnEligibilityResponse>(
    `/api/pharmacy/v1/dispense-transactions/${encodeURIComponent(dispenseId)}/return-eligibility`,
  );
}

export async function listDispenseReturns(
  params: DispenseReturnListParams,
): Promise<DispenseReturnListResponse> {
  return apiClient<DispenseReturnListResponse>(
    `/api/pharmacy/v1/returns${buildListQuery(params)}`,
  );
}

export async function fetchDispenseReturn(returnId: string): Promise<DispenseReturnDetail> {
  return apiClient<DispenseReturnDetail>(
    `/api/pharmacy/v1/returns/${encodeURIComponent(returnId)}`,
  );
}

export async function processDispenseReturn(
  body: ProcessDispenseReturnInput,
  idempotencyKey: string,
): Promise<DispenseReturnDetail> {
  return apiClient<DispenseReturnDetail>('/api/pharmacy/v1/returns', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  });
}

export function useDispenseReturnSearch(params: DispenseReturnSearchParams, enabled: boolean) {
  return useQuery({
    queryKey: pharmacyQueryKeys.returnSearch(params),
    queryFn: () => searchDispenseForReturn(params),
    enabled,
  });
}

export function useDispenseReturnEligibility(dispenseId: string | null) {
  return useQuery({
    queryKey: pharmacyQueryKeys.returnEligibility(dispenseId ?? ''),
    queryFn: () => fetchDispenseReturnEligibility(dispenseId!),
    enabled: Boolean(dispenseId),
  });
}

export function useDispenseReturnsList(params: DispenseReturnListParams) {
  return useQuery({
    queryKey: pharmacyQueryKeys.returnsList(params),
    queryFn: () => listDispenseReturns(params),
  });
}

export function useDispenseReturn(returnId: string) {
  return useQuery({
    queryKey: pharmacyQueryKeys.returnDetail(returnId),
    queryFn: () => fetchDispenseReturn(returnId),
    enabled: returnId.trim().length > 0,
  });
}

export function useProcessDispenseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: ProcessDispenseReturnInput;
      idempotencyKey: string;
    }) => processDispenseReturn(body, idempotencyKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pharmacyQueryKeys.all });
    },
  });
}
