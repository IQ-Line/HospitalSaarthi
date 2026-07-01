import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { OPERATIONAL_INVENTORY_API_ENABLED } from '../lib/inventory-api-enabled';
import {
  mockFetchInventoryDashboard,
  mockFetchInventoryGrnLogs,
  mockFetchInventoryIndents,
  mockFetchInventoryItems,
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
  InventoryReconciliationRow,
  InventoryStockListData,
  InventoryStockLot,
  InventoryStore,
  InventoryTransferListData,
  InventoryTransferListParams,
} from '../types';
import type { InventorySvcGrnDetail, InventorySvcGrnListResponse, InventorySvcItemRow, InventorySvcSingleResponse, InventorySvcStoreRow } from './api-types';
import { inventorySvcGet, inventorySvcGetList } from './inventory-api-client';
import { mapInventorySvcGrnListResponse, mapInventorySvcItemRow, mapInventorySvcStoreRow, mapUiGrnTypeToApi } from './mappers';
import { inventoryQueryKeys } from './query-keys';

type QueryResult<T> = Pick<UseQueryResult<T>, 'data' | 'isLoading' | 'error'>;

type QueryResultWithRefetch<T> = QueryResult<T> &
  Pick<UseQueryResult<T>, 'isError' | 'refetch'>;

const inventoryApiMode = OPERATIONAL_INVENTORY_API_ENABLED ? 'live' : 'mock';

async function fetchInventoryStores(): Promise<InventoryStore[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryStores();
  const response = await inventorySvcGetList<InventorySvcStoreRow>('/stores', {
    is_active: true,
    limit: 200,
  });
  return response.data.map(mapInventorySvcStoreRow);
}

async function fetchInventoryItems(): Promise<InventoryItemOption[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryItems();
  const response = await inventorySvcGetList<InventorySvcItemRow>('/items', {
    is_active: true,
    limit: 200,
  });
  return response.data.map(mapInventorySvcItemRow);
}

async function fetchInventoryDashboard(storeId?: string): Promise<InventoryDashboardData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryDashboard();
  // Dashboard aggregate not yet on inventory-svc.
  return mockFetchInventoryDashboard();
}

async function fetchInventoryStock(params: InventoryListParams): Promise<InventoryStockListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryStock(params);
  // Stock list not yet on inventory-svc.
  return mockFetchInventoryStock(params);
}

async function fetchInventoryStockLots(stockId: string): Promise<InventoryStockLot[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryStockLots(stockId);
  return mockFetchInventoryStockLots(stockId);
}

async function fetchInventoryIndents(
  params: InventoryIndentListParams,
): Promise<InventoryIndentListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryIndents(params);
  return mockFetchInventoryIndents(params);
}

async function fetchInventoryGrnLogs(params: InventoryGrnListParams): Promise<InventoryGrnListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryGrnLogs(params);
  const response = await inventorySvcGet<InventorySvcGrnListResponse>('/grns', {
    search: params.search,
    grn_type: params.type && params.type !== 'all' ? mapUiGrnTypeToApi(params.type) : undefined,
    summary_filter:
      params.summary_filter && params.summary_filter !== 'all' ? params.summary_filter : undefined,
    status:
      params.status === 'Draft' || params.status === 'draft'
        ? 'draft'
        : params.status === 'Submitted' || params.status === 'submitted'
          ? 'submitted'
          : undefined,
  });
  return mapInventorySvcGrnListResponse(response);
}

async function fetchInventoryGrnById(grnId: string): Promise<InventorySvcGrnDetail> {
  const response = await inventorySvcGet<InventorySvcSingleResponse<InventorySvcGrnDetail>>(
    `/grns/${encodeURIComponent(grnId)}`,
  );
  return response.data;
}

async function fetchInventoryReconciliation(): Promise<InventoryReconciliationRow[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryReconciliation();
  return mockFetchInventoryReconciliation();
}

async function fetchInventoryTransfers(
  params: InventoryTransferListParams,
): Promise<InventoryTransferListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryTransfers(params);
  // Transfers list not yet on inventory-svc.
  return mockFetchInventoryTransfers(params);
}

export function useInventoryStores(): QueryResult<InventoryStore[]> {
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.stores(), inventoryApiMode],
    queryFn: fetchInventoryStores,
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryItems(): QueryResult<InventoryItemOption[]> {
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.items(), inventoryApiMode],
    queryFn: fetchInventoryItems,
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
): QueryResultWithRefetch<InventoryGrnListData> {
  const query = useQuery({
    queryKey: inventoryQueryKeys.grnLogs(params),
    queryFn: () => fetchInventoryGrnLogs(params),
    staleTime: 15_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error, isError: query.isError, refetch: query.refetch };
}

export function useInventoryGrnDetail(grnId: string | undefined): QueryResultWithRefetch<InventorySvcGrnDetail | undefined> {
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.all, 'grn', grnId] as const,
    queryFn: () => fetchInventoryGrnById(grnId!),
    enabled: Boolean(grnId) && OPERATIONAL_INVENTORY_API_ENABLED,
    staleTime: 15_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error, isError: query.isError, refetch: query.refetch };
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
