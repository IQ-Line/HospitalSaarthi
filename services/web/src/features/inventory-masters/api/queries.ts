import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  resolveInventoryCatalogScopeKey,
} from '@/lib/catalog-tenant';
import {
  inventoryMastersApiContext,
  useInventoryMastersTenantId,
} from '@/features/inventory-masters/lib/inventory-catalog-api-context';
import { apiClient } from '@/lib/api-client';
import type { VisitpadListResponse, VisitpadManufacturer } from '@/features/visitpad/types';
import type {
  InventoryCategory,
  InventoryHsnGst,
  InventoryItemMaster,
  InventoryItemType,
  InventoryManufacturer,
  InventoryMasterListParams,
  InventoryStorageCondition,
  InventoryStoreType,
  InventoryUom,
  PaginatedList,
} from '../types';
import type {
  InventoryHsnGstApiRow,
  InventoryItemApiRow,
  InventoryItemListResponse,
  InventoryItemTypeApiRow,
  InventoryMasterListResponse,
  InventoryStorageConditionApiRow,
  InventoryStoreTypeApiRow,
  InventoryUomApiRow,
} from './api-types';
import {
  buildInventoryItemsListUrl,
  buildInventoryMasterListUrl,
  buildVisitpadManufacturersListUrl,
} from './list-url';
import {
  mapInventoryCategoryRows,
  mapInventoryHsnGstRow,
  mapInventoryItemRow,
  mapInventoryItemTypeRow,
  type InventoryItemLookupMaps,
  mapInventoryStorageConditionRow,
  mapInventoryStoreTypeRow,
  mapInventoryUomRow,
  mapVisitpadManufacturerRow,
} from './mappers';
import { inventoryMastersQueryKeys } from './query-keys';

type ListQueryResult<T> = Pick<UseQueryResult<PaginatedList<T>>, 'data' | 'isLoading' | 'error'>;

function useInventoryMastersCatalogScopeKey(): string {
  const catalogTenantId = useInventoryMastersTenantId();
  return catalogTenantId ?? resolveInventoryCatalogScopeKey(null);
}

function scopeKeySegment(scopeKey: string): readonly [string] {
  return [scopeKey];
}

async function fetchInventoryMasterList<TApi, TUi>(
  url: string,
  mapRows: (rows: TApi[]) => TUi[],
): Promise<PaginatedList<TUi>> {
  const response = await apiClient<InventoryMasterListResponse<TApi>>(
    url,
    { method: 'GET' },
    inventoryMastersApiContext(),
  );
  const rows = mapRows(response.data);
  return { data: rows, total: response.total };
}

function useInventoryMasterListQuery<TApi, TUi>(options: {
  queryKey: readonly unknown[];
  url: string;
  mapRows: (rows: TApi[]) => TUi[];
}): ListQueryResult<TUi> {
  const scopeKey = useInventoryMastersCatalogScopeKey();
  const query = useQuery({
    queryKey: [...options.queryKey, ...scopeKeySegment(scopeKey)],
    queryFn: () => fetchInventoryMasterList<TApi, TUi>(options.url, options.mapRows),
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

/** Item catalog rows from inventory-svc (`inventory.items`). */
export function useInventoryItems(
  params: InventoryMasterListParams = {},
  lookups?: InventoryItemLookupMaps,
): ListQueryResult<InventoryItemMaster> {
  const scopeKey = useInventoryMastersCatalogScopeKey();
  const lookupKey = [
    lookups?.itemTypeNameById.size ?? 0,
    lookups?.categoryNameById.size ?? 0,
  ] as const;
  const query = useQuery({
    queryKey: [...inventoryMastersQueryKeys.items(params), ...scopeKeySegment(scopeKey), ...lookupKey],
    queryFn: async (): Promise<PaginatedList<InventoryItemMaster>> => {
      const response = await apiClient<InventoryItemListResponse>(buildInventoryItemsListUrl(params));
      const itemTypeNameById = lookups?.itemTypeNameById ?? new Map<string, string>();
      const categoryNameById = lookups?.categoryNameById ?? new Map<string, string>();
      const rows = response.data.map((row: InventoryItemApiRow) =>
        mapInventoryItemRow(row, { itemTypeNameById, categoryNameById }),
      );
      return { data: rows, total: response.total };
    },
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryCategories(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryCategory> {
  return useInventoryMasterListQuery({
    queryKey: inventoryMastersQueryKeys.categories(params),
    url: buildInventoryMasterListUrl('/categories', params),
    mapRows: mapInventoryCategoryRows,
  });
}

export function useInventoryItemTypes(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryItemType> {
  return useInventoryMasterListQuery({
    queryKey: inventoryMastersQueryKeys.itemTypes(params),
    url: buildInventoryMasterListUrl('/item-types', params),
    mapRows: (rows: InventoryItemTypeApiRow[]) =>
      rows.filter((row) => !row.is_deleted).map(mapInventoryItemTypeRow),
  });
}

export function useInventoryUoms(params: InventoryMasterListParams = {}): ListQueryResult<InventoryUom> {
  return useInventoryMasterListQuery({
    queryKey: inventoryMastersQueryKeys.uoms(params),
    url: buildInventoryMasterListUrl('/uoms', params),
    mapRows: (rows: InventoryUomApiRow[]) =>
      rows.filter((row) => !row.is_deleted).map(mapInventoryUomRow),
  });
}

export function useInventoryStorageConditions(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryStorageCondition> {
  return useInventoryMasterListQuery({
    queryKey: inventoryMastersQueryKeys.storageConditions(params),
    url: buildInventoryMasterListUrl('/storage-conditions', params),
    mapRows: (rows: InventoryStorageConditionApiRow[]) =>
      rows.filter((row) => !row.is_deleted).map(mapInventoryStorageConditionRow),
  });
}

export function useInventoryHsnGst(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryHsnGst> {
  return useInventoryMasterListQuery({
    queryKey: inventoryMastersQueryKeys.hsnGst(params),
    url: buildInventoryMasterListUrl('/hsn-gst', params),
    mapRows: (rows: InventoryHsnGstApiRow[]) =>
      rows.filter((row) => !row.is_deleted).map(mapInventoryHsnGstRow),
  });
}

export function useInventoryManufacturers(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryManufacturer> {
  const scopeKey = useInventoryMastersCatalogScopeKey();
  const query = useQuery({
    queryKey: [...inventoryMastersQueryKeys.manufacturers(params), ...scopeKeySegment(scopeKey)],
    queryFn: async (): Promise<PaginatedList<InventoryManufacturer>> => {
      const response = await apiClient<VisitpadListResponse<VisitpadManufacturer>>(
        buildVisitpadManufacturersListUrl(params),
        { method: 'GET' },
        inventoryMastersApiContext(),
      );
      const rows = response.data
        .filter((row) => !row.is_deleted)
        .map(mapVisitpadManufacturerRow);
      return { data: rows, total: response.total };
    },
  });
  return { data: query.data, isLoading: query.isPending, error: query.error };
}

export function useInventoryStoreTypes(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryStoreType> {
  return useInventoryMasterListQuery({
    queryKey: inventoryMastersQueryKeys.storeTypes(params),
    url: buildInventoryMasterListUrl('/store-types', params),
    mapRows: (rows: InventoryStoreTypeApiRow[]) =>
      rows.filter((row) => !row.is_deleted).map(mapInventoryStoreTypeRow),
  });
}
