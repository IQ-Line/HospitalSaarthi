import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { OPERATIONAL_INVENTORY_API_ENABLED } from '../lib/inventory-api-enabled';
import {
  mockFetchInventoryDashboard,
  mockFetchInventoryGrnLogs,
  mockFetchInventoryIndents,
  mockFetchInventoryIndentByNumber,
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
  InventoryIndentActiveMatch,
  InventoryIndentRow,
  InventoryIndentStoreOption,
  InventoryItemOption,
  InventoryListParams,
  InventoryReconciliationRow,
  InventoryStockListData,
  InventoryStockLot,
  InventoryStore,
  InventoryTransferListData,
  InventoryTransferListParams,
} from '../types';
import type { InventorySvcGrnDetail, InventorySvcGrnListResponse, InventorySvcIndentListResponse, InventorySvcIndentRow, InventorySvcIndentStoreOption, InventorySvcItemRow, InventorySvcSingleResponse, InventorySvcStockBatchesResponse, InventorySvcStockListResponse, InventorySvcStockTransferListResponse, InventorySvcStockTransferRow, InventorySvcStoreRow } from './api-types';
import { inventorySvcGet, inventorySvcGetList } from './inventory-api-client';
import {
  mapInventorySvcGrnListResponse,
  mapInventorySvcIndentDetail,
  mapInventorySvcIndentListResponse,
  mapInventorySvcItemRow,
  mapInventorySvcStockBatchRow,
  mapInventorySvcStockListResponse,
  mapInventorySvcStockTransferListResponse,
  mapInventorySvcStockTransferRow,
  mapInventorySvcStoreRow,
  mapUiGrnTypeToApi,
} from './mappers';
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
  if (!params.store_id) {
    return { data: [], total: 0, summary: { critical: 0, low: 0, normal: 0 } };
  }
  const response = await inventorySvcGet<InventorySvcStockListResponse>('/stock', {
    store_id: params.store_id,
    search: params.search,
    status: params.status && params.status !== 'all' ? params.status : undefined,
    page_size: 500,
  });
  return mapInventorySvcStockListResponse(response);
}

async function fetchInventoryStockLots(
  itemId: string,
  storeId: string,
): Promise<InventoryStockLot[]> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryStockLots(itemId);
  const response = await inventorySvcGet<InventorySvcStockBatchesResponse>(
    `/stock/${encodeURIComponent(itemId)}/batches`,
    { store_id: storeId },
  );
  return response.data.map(mapInventorySvcStockBatchRow);
}

async function fetchInventoryIndents(
  params: InventoryIndentListParams,
): Promise<InventoryIndentListData> {
  if (!OPERATIONAL_INVENTORY_API_ENABLED) return mockFetchInventoryIndents(params);
  const page = params.page ?? 1;
  const pageSize = params.limit ?? 10;
  const response = await inventorySvcGet<InventorySvcIndentListResponse>('/indents', {
    search: params.search,
    status: params.status && params.status !== 'all' ? params.status : undefined,
    from_store_id: params.from_store_id,
    to_store_id: params.to_store_id,
    include_lines: true,
    page,
    page_size: pageSize,
  });
  return mapInventorySvcIndentListResponse(response);
}

async function fetchInventoryIndentStores(): Promise<InventoryIndentStoreOption[]> {
  const response = await inventorySvcGet<{ stores: InventorySvcIndentStoreOption[] }>(
    '/indents/stores',
    { role: 'all' },
  );
  return response.stores.map((store) => ({
    id: store.store_id,
    name: store.store_name,
    store_code: store.store_code,
    indent_authority: store.indent_authority,
    indent_target_store_id: store.indent_target_store_id,
  }));
}

async function fetchInventoryIndentById(indentId: string) {
  const response = await inventorySvcGet<InventorySvcSingleResponse<InventorySvcIndentRow>>(
    `/indents/${encodeURIComponent(indentId)}`,
  );
  return mapInventorySvcIndentDetail(response.data);
}

async function fetchInventoryIndentByNumber(indentNumber: string) {
  const normalized = indentNumber.trim();
  if (!OPERATIONAL_INVENTORY_API_ENABLED) {
    return mockFetchInventoryIndentByNumber(normalized);
  }

  const listParams = {
    include_lines: true,
    page_size: 20,
  };

  const findExactMatch = (items: InventorySvcIndentRow[]) =>
    items.find((row) => row.indent_number.trim().toLowerCase() === normalized.toLowerCase());

  try {
    const byNumber = await inventorySvcGet<InventorySvcIndentListResponse>('/indents', {
      ...listParams,
      indent_number: normalized,
      page_size: 1,
    });
    const exact = findExactMatch(byNumber.items);
    if (exact) return mapInventorySvcIndentDetail(exact);
  } catch {
    // Older inventory-svc without indent_number query — fall through to search.
  }

  const bySearch = await inventorySvcGet<InventorySvcIndentListResponse>('/indents', {
    ...listParams,
    search: normalized,
  });
  const match = findExactMatch(bySearch.items);
  if (!match) {
    throw new Error(`No indent found with number ${normalized}.`);
  }
  return mapInventorySvcIndentDetail(match);
}

async function fetchInventoryIndentActiveCheck(params: {
  from_store_id: string;
  to_store_id?: string;
  item_id: string;
  exclude_indent_id?: string;
}): Promise<InventoryIndentActiveMatch[]> {
  const response = await inventorySvcGet<{ matches: InventoryIndentActiveMatch[] }>(
    '/indents/active-check',
    {
      from_store_id: params.from_store_id,
      to_store_id: params.to_store_id,
      item_id: params.item_id,
      exclude_indent_id: params.exclude_indent_id,
    },
  );
  return response.matches;
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
  const page = params.page ?? 1;
  const pageSize = params.limit ?? 10;
  const response = await inventorySvcGet<InventorySvcStockTransferListResponse>('/transfers', {
    search: params.search,
    status: params.status,
    statuses: params.statuses?.join(','),
    from_store_id: params.from_store_id,
    to_store_id: params.to_store_id,
    page,
    page_size: pageSize,
  });
  return mapInventorySvcStockTransferListResponse(response);
}

async function fetchInventoryTransferById(transferId: string) {
  const response = await inventorySvcGet<InventorySvcSingleResponse<InventorySvcStockTransferRow>>(
    `/transfers/${encodeURIComponent(transferId)}`,
  );
  return mapInventorySvcStockTransferRow(response.data);
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
    queryKey: [...inventoryQueryKeys.stock(params), inventoryApiMode],
    queryFn: () => fetchInventoryStock(params),
    enabled: !OPERATIONAL_INVENTORY_API_ENABLED || Boolean(params.store_id),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryStockLots(
  itemId: string | null,
  storeId: string | undefined,
): QueryResult<InventoryStockLot[]> {
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.stockLots(itemId ?? '', storeId), inventoryApiMode],
    queryFn: () => fetchInventoryStockLots(itemId!, storeId!),
    enabled: Boolean(itemId) && Boolean(storeId),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryIndents(
  params: InventoryIndentListParams = {},
): QueryResult<InventoryIndentListData> {
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.indents(params), inventoryApiMode],
    queryFn: () => fetchInventoryIndents(params),
    staleTime: 15_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryIndentStores(): QueryResult<InventoryIndentStoreOption[]> {
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.all, 'indent-stores', inventoryApiMode] as const,
    queryFn: fetchInventoryIndentStores,
    enabled: OPERATIONAL_INVENTORY_API_ENABLED,
    staleTime: 60_000,
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryIndentDetail(
  indentId: string | undefined,
): QueryResultWithRefetch<InventoryIndentRow | undefined> {
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.all, 'indent', indentId, inventoryApiMode] as const,
    queryFn: () => fetchInventoryIndentById(indentId!),
    enabled: Boolean(indentId) && indentId !== 'new' && OPERATIONAL_INVENTORY_API_ENABLED,
    staleTime: 15_000,
  });
  return {
    data: query.data,
    isLoading: query.isPending,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useInventoryIndentByNumber(
  indentNumber: string | undefined,
  options?: { enabled?: boolean },
): QueryResultWithRefetch<InventoryIndentRow | undefined> {
  const normalized = indentNumber?.trim() ?? '';
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.all, 'indent-by-number', normalized, inventoryApiMode] as const,
    queryFn: () => fetchInventoryIndentByNumber(normalized),
    enabled: (options?.enabled ?? true) && normalized.length >= 3,
    staleTime: 15_000,
    retry: false,
  });
  return {
    data: query.data,
    isLoading: query.isPending,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useInventoryIndentActiveChecks(
  lines: Array<{ id: string; item_id?: string }>,
  fromStoreId: string,
  toStoreId: string,
  indentId: string,
): Record<string, InventoryIndentActiveMatch[]> {
  const excludeIndentId = indentId !== 'new' ? indentId : undefined;
  const activeLines = lines.filter((line) => Boolean(line.item_id));

  const queries = useQueries({
    queries: activeLines.map((line) => {
      const params = {
        from_store_id: fromStoreId,
        to_store_id: toStoreId || undefined,
        item_id: line.item_id!,
        exclude_indent_id: excludeIndentId,
      };
      return {
        queryKey: [...inventoryQueryKeys.indentActiveCheck(params), inventoryApiMode] as const,
        queryFn: () => fetchInventoryIndentActiveCheck(params),
        enabled:
          OPERATIONAL_INVENTORY_API_ENABLED &&
          Boolean(fromStoreId) &&
          Boolean(line.item_id),
        staleTime: 15_000,
      };
    }),
  });

  const matchesByLineId: Record<string, InventoryIndentActiveMatch[]> = {};
  activeLines.forEach((line, index) => {
    const matches = queries[index]?.data ?? [];
    if (matches.length > 0) {
      matchesByLineId[line.id] = matches;
    }
  });
  return matchesByLineId;
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

export function useInventoryTransferDetail(
  transferId: string | undefined,
): QueryResultWithRefetch<InventoryTransferListData['data'][number] | undefined> {
  const query = useQuery({
    queryKey: [...inventoryQueryKeys.all, 'transfer', transferId, inventoryApiMode] as const,
    queryFn: () => fetchInventoryTransferById(transferId!),
    enabled: Boolean(transferId) && OPERATIONAL_INVENTORY_API_ENABLED,
    staleTime: 15_000,
  });
  return {
    data: query.data,
    isLoading: query.isPending,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
}
