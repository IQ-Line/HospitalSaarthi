import { apiClient } from '@/lib/api-client';
import type { PharmacyQueueListParams, PharmacyQueueListResponse } from '../types';

const PHARMACY_QUEUE_PATH = '/api/pharmacy/v1/queue';

export async function fetchPharmacyQueue(
  params: PharmacyQueueListParams,
): Promise<PharmacyQueueListResponse> {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.queued_from?.trim()) {
    search.set('queued_from', params.queued_from.trim());
  }
  if (params.queued_to?.trim()) {
    search.set('queued_to', params.queued_to.trim());
  }
  if (params.q?.trim()) {
    search.set('q', params.q.trim());
  }
  if (params.status && params.status !== 'all') {
    search.set('status', params.status);
  }
  return apiClient<PharmacyQueueListResponse>(`${PHARMACY_QUEUE_PATH}?${search.toString()}`);
}
