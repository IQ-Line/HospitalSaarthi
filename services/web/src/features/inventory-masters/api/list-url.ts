import type { InventoryMasterListParams } from '../types';
import { INVENTORY_ITEMS_API_BASE, INVENTORY_MASTERS_API_BASE } from './query-keys';

export const INVENTORY_MASTERS_DEFAULT_PAGE_SIZE = 50;

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
  for (const [key, value] of Object.entries(inventoryMasterListQueryParams(params))) {
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
