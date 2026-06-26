import type { InventoryMasterListParams, InventoryMasterStatus } from '../types';

export function filterBySearch<T>(
  rows: T[],
  search: string | undefined,
  parts: (row: T) => readonly string[],
): T[] {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) =>
    parts(row).some((value) => value.toLowerCase().includes(query)),
  );
}

export function filterByStatus<T extends { status: InventoryMasterStatus }>(
  rows: T[],
  status: InventoryMasterListParams['status'],
): T[] {
  if (!status || status === 'all') return rows;
  return rows.filter((row) => row.status === status);
}

export function paginateList<T>(
  rows: T[],
  pageIndex = 0,
  pageSize = 50,
): { data: T[]; total: number } {
  const total = rows.length;
  const start = pageIndex * pageSize;
  return { data: rows.slice(start, start + pageSize), total };
}

export function applyListParams<T extends { status: InventoryMasterStatus }>(
  rows: T[],
  params: InventoryMasterListParams,
  searchParts: (row: T) => readonly string[],
): { data: T[]; total: number } {
  const filtered = filterByStatus(filterBySearch(rows, params.search, searchParts), params.status);
  return paginateList(filtered, params.pageIndex, params.pageSize);
}
