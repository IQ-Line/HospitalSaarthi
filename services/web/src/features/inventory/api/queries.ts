import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  mockFetchInventoryDashboard,
  mockFetchInventoryGrnLogs,
  mockFetchInventoryIndents,
  mockFetchInventoryItems,
  mockFetchInventoryManufacturers,
  mockFetchInventoryReconciliation,
  mockFetchInventoryStock,
  mockFetchInventoryStockLots,
  mockFetchInventoryStores,
  mockFetchInventoryTransfers,
} from '../mock/operations';
import type {
  InventoryDashboardData,
  InventoryGrnListData,
  InventoryGrnListParams,
  InventoryIndentListData,
  InventoryIndentListParams,
  InventoryItemOption,
  InventoryListParams,
  InventoryManufacturerOption,
  InventoryReconciliationRow,
  InventoryStockListData,
  InventoryStockLot,
  InventoryStore,
  InventoryTransferListData,
  InventoryTransferListParams,
} from '../types';
import { inventoryQueryKeys, INVENTORY_API_BASE } from './query-keys';

type QueryResult<T> = Pick<UseQueryResult<T>, 'data' | 'isLoading' | 'error'>;

/**
 * Flip to `true` when inventory-svc operational routes are proxied on the BFF.
 * Mock fetchers mirror the same response shapes for a straightforward swap.
 */
const OPERATIONAL_INVENTORY_API_ENABLED = false;

async function fetchInventoryStores(): Promise<InventoryStore[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryStores();
  const response = await apiClient<{ data: InventoryStore[] }>(`${INVENTORY_API_BASE}/stores`);
  return response.data;
}

async function fetchInventoryItems(): Promise<InventoryItemOption[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryItems();
  const response = await apiClient<{ data: InventoryItemOption[] }>(`${INVENTORY_API_BASE}/items`);
  return response.data;
}

async function fetchInventoryManufacturers(): Promise<InventoryManufacturerOption[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryManufacturers();
  const response = await apiClient<{ data: InventoryManufacturerOption[] }>(
    `${INVENTORY_API_BASE}/manufacturers`,
  );
  return response.data;
}

async function fetchInventoryDashboard(storeId?: string): Promise<InventoryDashboardData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryDashboard();
  const suffix = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return apiClient<InventoryDashboardData>(`${INVENTORY_API_BASE}/dashboard${suffix}`);
}

async function fetchInventoryStock(params: InventoryListParams): Promise<InventoryStockListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryStock(params);
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.store_id) q.set('store_id', params.store_id);
  if (params.status && params.status !== 'all') q.set('status', params.status);
  const query = q.toString();
  return apiClient<InventoryStockListData>(
    `${INVENTORY_API_BASE}/stock${query ? `?${query}` : ''}`,
  );
}

async function fetchInventoryStockLots(stockId: string): Promise<InventoryStockLot[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryStockLots(stockId);
  const response = await apiClient<{ data: InventoryStockLot[] }>(
    `${INVENTORY_API_BASE}/stock/${stockId}/lots`,
  );
  return response.data;
}

async function fetchInventoryIndents(
  params: InventoryIndentListParams,
): Promise<InventoryIndentListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryIndents(params);
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const query = q.toString();
  return apiClient<InventoryIndentListData>(
    `${INVENTORY_API_BASE}/indents${query ? `?${query}` : ''}`,
  );
}

async function fetchInventoryGrnLogs(params: InventoryGrnListParams): Promise<InventoryGrnListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryGrnLogs(params);
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.type && params.type !== 'all') q.set('type', params.type);
  if (params.summary_filter) q.set('summary_filter', params.summary_filter);
  const query = q.toString();
  return apiClient<InventoryGrnListData>(
    `${INVENTORY_API_BASE}/grn-logs${query ? `?${query}` : ''}`,
  );
}

async function fetchInventoryReconciliation(): Promise<InventoryReconciliationRow[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryReconciliation();
  const response = await apiClient<{ data: InventoryReconciliationRow[] }>(
    `${INVENTORY_API_BASE}/pharmacy-reconciliation`,
  );
  return response.data;
}

async function fetchInventoryTransfers(
  params: InventoryTransferListParams,
): Promise<InventoryTransferListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryTransfers(params);
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const query = q.toString();
  return apiClient<InventoryTransferListData>(
    `${INVENTORY_API_BASE}/transfers${query ? `?${query}` : ''}`,
  );
}

export function useInventoryStores(): QueryResult<InventoryStore[]> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.stores(),
    queryFn: fetchInventoryStores,
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryItems(): QueryResult<InventoryItemOption[]> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.items(),
    queryFn: fetchInventoryItems,
    staleTime: 60_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryManufacturers(): QueryResult<InventoryManufacturerOption[]> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.manufacturers(),
    queryFn: fetchInventoryManufacturers,
    staleTime: 60_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryDashboard(storeId?: string): QueryResult<InventoryDashboardData> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.dashboard(storeId),
    queryFn: () => fetchInventoryDashboard(storeId),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryStock(params: InventoryListParams = {}): QueryResult<InventoryStockListData> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.stock(params),
    queryFn: () => fetchInventoryStock(params),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryStockLots(stockId: string | null): QueryResult<InventoryStockLot[]> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.stockLots(stockId ?? ''),
    queryFn: () => fetchInventoryStockLots(stockId!),
    enabled: Boolean(stockId),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryIndents(
  params: InventoryIndentListParams = {},
): QueryResult<InventoryIndentListData> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.indents(params),
    queryFn: () => fetchInventoryIndents(params),
    staleTime: 15_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryGrnLogs(
  params: InventoryGrnListParams = {},
): QueryResult<InventoryGrnListData> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.grnLogs(params),
    queryFn: () => fetchInventoryGrnLogs(params),
    staleTime: 15_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryReconciliation(): QueryResult<InventoryReconciliationRow[]> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.reconciliation(),
    queryFn: fetchInventoryReconciliation,
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryTransfers(
  params: InventoryTransferListParams = {},
): QueryResult<InventoryTransferListData> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.transfers(params),
    queryFn: () => fetchInventoryTransfers(params),
    staleTime: 15_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}
