import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  DUMMY_INVENTORY_DASHBOARD,
  DUMMY_INVENTORY_STOCK,
} from '../dummy-data';
import type {
  InventoryDashboardData,
  InventoryListParams,
  InventoryStockListData,
  InventoryStockRow,
  InventoryStore,
} from '../types';

type StoreListResponse = {
  data: Array<{ id: string; store_name: string; store_code: string; is_active: boolean }>;
};

function filterStockRows(rows: InventoryStockRow[], params: InventoryListParams): InventoryStockRow[] {
  let filtered = rows;
  const query = params.search?.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      (row) =>
        row.item_name.toLowerCase().includes(query) ||
        row.item_code.toLowerCase().includes(query),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((row) => row.status === params.status);
  }
  return filtered;
}

export function useInventoryStores() {
  return useQuery({
    queryKey: ['inventory', 'stores'],
    queryFn: async (): Promise<InventoryStore[]> => {
      const q = new URLSearchParams({ limit: '200', offset: '0', is_active: 'true' });
      const res = await apiClient<StoreListResponse>(`/api/inventory/v1/stores?${q.toString()}`);
      return res.data.map((row) => ({
        id: row.id,
        name: row.store_name,
        store_code: row.store_code,
      }));
    },
    staleTime: 60_000,
  });
}

export function useInventoryDashboard(_storeId?: string): {
  data: InventoryDashboardData | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  return { data: DUMMY_INVENTORY_DASHBOARD, isLoading: false, error: null };
}

export function useInventoryStock(params: InventoryListParams = {}): {
  data: InventoryStockListData | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const rows = filterStockRows(DUMMY_INVENTORY_STOCK.data, params);
  const summary = rows.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { critical: 0, low: 0, normal: 0 },
  );
  return {
    data: { data: rows, total: rows.length, summary },
    isLoading: false,
    error: null,
  };
}
