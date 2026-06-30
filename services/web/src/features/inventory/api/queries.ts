import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  InventoryDashboardData,
  InventoryListParams,
  InventoryStockListData,
  InventoryStore,
} from '../types';
import { inventoryQueryKeys, INVENTORY_API_BASE } from './query-keys';

type QueryResult<T> = Pick<UseQueryResult<T>, 'data' | 'isLoading' | 'error'>;

const EMPTY_DASHBOARD: InventoryDashboardData = {
  stats: {
    active_items: 0,
    low_stock: 0,
    expiring_soon: 0,
    pending_approvals: 0,
  },
  low_stock_items: [],
  expiring_lots: [],
};

const EMPTY_STOCK: InventoryStockListData = {
  data: [],
  total: 0,
  summary: { critical: 0, low: 0, normal: 0 },
};

/**
 * Operational inventory HTTP handlers are not registered on inventory-svc yet.
 * Queries return empty collections until `${INVENTORY_API_BASE}` is proxied by the BFF.
 */
const OPERATIONAL_INVENTORY_API_ENABLED = false;

async function fetchOperationalInventoryStores(): Promise<InventoryStore[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) {
    return [];
  }
  const response = await apiClient<{ data: InventoryStore[] }>(`${INVENTORY_API_BASE}/stores`);
  return response.data;
}

async function fetchOperationalInventoryDashboard(_storeId?: string): Promise<InventoryDashboardData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) {
    return EMPTY_DASHBOARD;
  }
  const suffix = _storeId ? `?store_id=${encodeURIComponent(_storeId)}` : '';
  return apiClient<InventoryDashboardData>(`${INVENTORY_API_BASE}/dashboard${suffix}`);
}

async function fetchOperationalInventoryStock(
  params: InventoryListParams,
): Promise<InventoryStockListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) {
    return EMPTY_STOCK;
  }
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.store_id) q.set('store_id', params.store_id);
  if (params.status && params.status !== 'all') q.set('status', params.status);
  const query = q.toString();
  return apiClient<InventoryStockListData>(
    `${INVENTORY_API_BASE}/stock${query ? `?${query}` : ''}`,
  );
}

export function useInventoryStores(): QueryResult<InventoryStore[]> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.stores(),
    queryFn: fetchOperationalInventoryStores,
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryDashboard(storeId?: string): QueryResult<InventoryDashboardData> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.dashboard(storeId),
    queryFn: () => fetchOperationalInventoryDashboard(storeId),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryStock(params: InventoryListParams = {}): QueryResult<InventoryStockListData> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.stock(params),
    queryFn: () => fetchOperationalInventoryStock(params),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}
