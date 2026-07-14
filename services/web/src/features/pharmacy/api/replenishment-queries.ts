import {
  useInventoryIndents,
  useInventoryIndentStores,
  useInventoryStock,
  useInventoryStores,
} from '@/features/inventory/api/queries';
import { PHARMACY_INDENT_DEFAULTS } from '@/features/inventory/lib/inventory-operational-variant';
import type { InventoryIndentListParams, InventoryStockRow } from '@/features/inventory/types';
import type {
  IndentRequestRow,
  IndentRequestStatus,
  PharmacyLowStockRow,
} from '@/features/pharmacy/types/replenishment-ui.types';

function mapStockRowToLowStock(row: InventoryStockRow): PharmacyLowStockRow {
  const status: PharmacyLowStockRow['status'] =
    row.quantity <= 0 ? 'out_of_stock' : row.status === 'normal' ? 'adequate' : 'low_stock';
  return {
    id: row.id,
    drug_name: row.item_name,
    item_code: row.item_code,
    available_qty: row.quantity,
    reorder_level: row.reorder_at,
    status,
  };
}

function mapIndentStatus(status: string): IndentRequestStatus {
  const map: Record<string, IndentRequestStatus> = {
    draft: 'draft',
    submitted: 'submitted',
    approved: 'approved',
    partially_approved: 'approved',
    rejected: 'rejected',
    cancelled: 'rejected',
    in_fulfillment: 'procurement_pending',
    fulfilled: 'fulfilled',
  };
  return map[status] ?? 'draft';
}

function mapPriority(priority: string): IndentRequestRow['priority'] {
  const normalized = priority.toLowerCase();
  if (normalized === 'urgent') return 'urgent';
  if (normalized === 'stat') return 'stat';
  return 'normal';
}

export function usePharmacyReplenishmentLowStock(params: {
  store_id?: string;
  q?: string;
  page?: number;
  page_size?: number;
}) {
  const stockQuery = useInventoryStock({
    store_id: params.store_id ?? '',
    search: params.q,
    status: 'all',
  });

  const rows = (stockQuery.data?.data ?? [])
    .filter((row) => row.status !== 'normal')
    .map(mapStockRowToLowStock);

  const filtered = params.q?.trim()
    ? rows.filter(
        (row) =>
          row.drug_name.toLowerCase().includes(params.q!.toLowerCase()) ||
          row.item_code.toLowerCase().includes(params.q!.toLowerCase()),
      )
    : rows;

  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 10;
  const start = (page - 1) * pageSize;

  return {
    data: {
      data: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      page_size: pageSize,
    },
    isLoading: stockQuery.isLoading,
  };
}

export function usePharmacyReplenishmentIndents(params: {
  from_store_id?: string;
  q?: string;
  status?: IndentRequestStatus | '__all__';
  page?: number;
  page_size?: number;
  enabled?: boolean;
}) {
  const indentParams: InventoryIndentListParams = {
    indent_type: PHARMACY_INDENT_DEFAULTS.indent_type,
    from_store_id: params.from_store_id,
    search: params.q,
    page: params.page,
    limit: params.page_size,
  };

  const indentsQuery = useInventoryIndents(indentParams);

  const rows: IndentRequestRow[] = (indentsQuery.data?.data ?? []).map((indent) => ({
    id: indent.id,
    indent_number: indent.indent_number,
    request_date: indent.indent_date,
    to_store_name: indent.to_store,
    priority: mapPriority(indent.priority),
    status: mapIndentStatus(indent.status),
    lines: (indent.lines ?? []).map((line) => ({
      id: line.id,
      item_name: line.item_name,
      item_code: line.item_code,
      requested_qty: line.requested_qty,
      approved_qty: line.approved_qty,
    })),
  }));

  return {
    data: {
      data: rows,
      total: indentsQuery.data?.total ?? rows.length,
      page: params.page ?? 1,
      page_size: params.page_size ?? 10,
    },
    isLoading: indentsQuery.isLoading,
  };
}

export function usePharmacyReplenishmentStores() {
  const storesQuery = useInventoryStores();
  const indentStoresQuery = useInventoryIndentStores();

  const source =
    indentStoresQuery.data?.length && indentStoresQuery.data.length > 0
      ? indentStoresQuery.data
      : storesQuery.data;

  return {
    data:
      source?.map((store) => ({
        id: store.id,
        name: store.name,
        store_code: store.store_code,
      })) ?? [],
    isLoading: storesQuery.isLoading || indentStoresQuery.isLoading,
  };
}
