import type { UseQueryResult } from '@tanstack/react-query';
import {
  DUMMY_INVENTORY_CATEGORIES,
  DUMMY_INVENTORY_HSN_GST,
  DUMMY_INVENTORY_ITEMS,
  DUMMY_INVENTORY_ITEM_TYPES,
  DUMMY_INVENTORY_MANUFACTURERS,
  DUMMY_INVENTORY_STORAGE_CONDITIONS,
  DUMMY_INVENTORY_STORE_TYPES,
  DUMMY_INVENTORY_UOMS,
} from '../dummy-data';
import { applyListParams } from '../lib/filter-list';
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

type ListQueryResult<T> = Pick<UseQueryResult<PaginatedList<T>>, 'data' | 'isLoading' | 'error'>;

function stubListQuery<T extends { status: 'active' | 'inactive' }>(
  rows: T[],
  params: InventoryMasterListParams,
  searchParts: (row: T) => readonly string[],
): ListQueryResult<T> {
  return {
    data: applyListParams(rows, params, searchParts),
    isLoading: false,
    error: null,
  };
}

/** Swap implementations to `useQuery(inventoryMastersQueryOptions.items(params))` when APIs ship. */
export function useInventoryItems(params: InventoryMasterListParams = {}): ListQueryResult<InventoryItemMaster> {
  return stubListQuery(DUMMY_INVENTORY_ITEMS, params, (row) => [
    row.item_code,
    row.item_name,
    row.display_name,
    row.classification,
    row.item_type,
    row.product_category,
    row.department,
    row.manufacturer,
  ]);
}

export function useInventoryCategories(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryCategory> {
  return stubListQuery(DUMMY_INVENTORY_CATEGORIES, params, (row) => [
    row.category_name,
    row.parent_category ?? '',
  ]);
}

export function useInventoryItemTypes(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryItemType> {
  return stubListQuery(DUMMY_INVENTORY_ITEM_TYPES, params, (row) => [row.item_type]);
}

export function useInventoryUoms(params: InventoryMasterListParams = {}): ListQueryResult<InventoryUom> {
  return stubListQuery(DUMMY_INVENTORY_UOMS, params, (row) => [row.name, row.abbreviation]);
}

export function useInventoryStorageConditions(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryStorageCondition> {
  return stubListQuery(DUMMY_INVENTORY_STORAGE_CONDITIONS, params, (row) => [
    row.storage_condition,
    row.description ?? '',
  ]);
}

export function useInventoryHsnGst(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryHsnGst> {
  return stubListQuery(DUMMY_INVENTORY_HSN_GST, params, (row) => [row.hsn_code]);
}

export function useInventoryManufacturers(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryManufacturer> {
  return stubListQuery(DUMMY_INVENTORY_MANUFACTURERS, params, (row) => [
    row.manufacturer,
    row.code ?? '',
  ]);
}

export function useInventoryStoreTypes(
  params: InventoryMasterListParams = {},
): ListQueryResult<InventoryStoreType> {
  return stubListQuery(DUMMY_INVENTORY_STORE_TYPES, params, (row) => [
    row.code,
    row.store_type,
    row.description ?? '',
  ]);
}
