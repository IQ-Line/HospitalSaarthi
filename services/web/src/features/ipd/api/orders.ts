import { apiClient } from '@/lib/api-client';
import { ipdUseMock } from './admissions';
import type {
  CreateInpatientOrderInput,
  InpatientOrderApi,
  OrdersListParams,
  OrdersListResponse,
} from '../lib/order-types';
import { createMockOrder, listMockOrders } from '../mock/orders';

const IPD_PREFIX = '/api/ipd/v1';

export async function fetchInpatientOrders(
  admissionId: string,
  params: OrdersListParams,
): Promise<OrdersListResponse> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 80));
    return listMockOrders(admissionId, params);
  }

  const search = new URLSearchParams();
  search.set('page', String(params.page));
  search.set('limit', String(params.limit));
  if (params.orderCategory && params.orderCategory !== 'all') {
    search.set('order_category', params.orderCategory);
  }
  if (params.priority && params.priority !== 'all') {
    search.set('priority', params.priority);
  }
  if (params.status && params.status !== 'all') {
    search.set('status', params.status);
  }
  if (params.q?.trim()) search.set('q', params.q.trim());

  return apiClient<OrdersListResponse>(
    `${IPD_PREFIX}/admissions/${admissionId}/orders?${search.toString()}`,
  );
}

export async function createInpatientOrder(
  admissionId: string,
  input: CreateInpatientOrderInput,
): Promise<InpatientOrderApi> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 100));
    return createMockOrder(admissionId, input);
  }
  return apiClient<InpatientOrderApi>(`${IPD_PREFIX}/admissions/${admissionId}/orders`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
