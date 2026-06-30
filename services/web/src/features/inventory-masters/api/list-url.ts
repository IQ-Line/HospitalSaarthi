import type { InventoryMasterListParams } from '../types';
import { INVENTORY_ITEMS_API_BASE, INVENTORY_MASTERS_API_BASE } from './query-keys';

export const INVENTORY_MASTERS_DEFAULT_PAGE_SIZE = 50;

/** Max page size supported by inventory / visitpad catalog list APIs. */
export const INVENTORY_MASTERS_MAX_PAGE_SIZE = 200;

export const INVENTORY_MASTERS_PAGE_SIZES = [20, 50, 100, 200] as const;

/** Active masters for create-form dropdowns (not table pagination). */
export const INVENTORY_MASTERS_FORM_LOOKUP_PARAMS: InventoryMasterListParams = {
  status: 'active',
  pageIndex: 0,
  pageSize: INVENTORY_MASTERS_MAX_PAGE_SIZE,
};

function normalizePage(params: InventoryMasterListParams = {}) {
  const pageSize = params.pageSize ?? INVENTORY_MASTERS_DEFAULT_PAGE_SIZE;
  const pageIndex = Math.max(0, params.pageIndex ?? 0);
  return { pageIndex, pageSize };
}

export function inventoryMasterListQueryParams(
  params: InventoryMasterListParams = {},
): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  const search = params.search?.trim();
  if (search) {
    query.search = search;
  }
  if (params.status === 'active') {
    query.is_active = 'true';
  } else if (params.status === 'inactive') {
    query.is_active = 'false';
  }
  return query;
}

export function inventoryItemsListQueryParams(
  params: InventoryMasterListParams = {},
): Record<string, string | undefined> {
  const query = inventoryMasterListQueryParams(params);
  const categoryId = params.categoryId?.trim();
  if (categoryId && categoryId !== 'all') {
    query.category_id = categoryId;
  }
  if (params.classification === 'medicine') {
    query.item_classification = 'medicine';
  } else if (params.classification === 'inventory_item') {
    query.item_classification = 'inventory';
  }
  return query;
}

export function buildInventoryMasterListUrl(
  resourcePath: string,
  params: InventoryMasterListParams = {},
): string {
  const q = new URLSearchParams();
  const { pageIndex, pageSize } = normalizePage(params);
  q.set('limit', String(pageSize));
  q.set('offset', String(pageIndex * pageSize));
  for (const [key, value] of Object.entries(inventoryMasterListQueryParams(params))) {
    if (value) {
      q.set(key, value);
    }
  }
  const path = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  return `${INVENTORY_MASTERS_API_BASE}${path}?${q.toString()}`;
}

export function buildInventoryItemsListUrl(params: InventoryMasterListParams = {}): string {
  const q = new URLSearchParams();
  const { pageIndex, pageSize } = normalizePage(params);
  q.set('limit', String(pageSize));
  q.set('offset', String(pageIndex * pageSize));
  for (const [key, value] of Object.entries(inventoryItemsListQueryParams(params))) {
    if (value) {
      q.set(key, value);
    }
  }
  return `${INVENTORY_ITEMS_API_BASE}?${q.toString()}`;
}

/** Visitpad manufacturers (shared with inventory item master). */
export function buildVisitpadManufacturersListUrl(params: InventoryMasterListParams = {}): string {
  const q = new URLSearchParams();
  const { pageIndex, pageSize } = normalizePage(params);
  q.set('limit', String(pageSize));
  q.set('offset', String(pageIndex * pageSize));
  for (const [key, value] of Object.entries(inventoryMasterListQueryParams(params))) {
    if (value) {
      q.set(key, value);
    }
  }
  return `/api/v1/master-data/visitpad/manufacturers?${q.toString()}`;
}
