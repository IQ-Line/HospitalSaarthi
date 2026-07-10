import type {
  InventoryDashboardData,
  InventoryDashboardStats,
  InventoryGrnListData,
  InventoryGrnListParams,
  InventoryIndentListData,
  InventoryIndentListParams,
  InventoryItemOption,
  InventoryExpiringLot,
  InventoryLowStockItem,
  InventoryListParams,
  InventoryManufacturerOption,
  InventoryReconciliationRow,
  InventoryStockListData,
  InventoryStockLot,
  InventoryStore,
  InventoryTransferListData,
  InventoryTransferListParams,
} from '../types';
import { INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS } from '../lib/inventory-dashboard-navigation';
import {
  MOCK_DASHBOARD,
  MOCK_GRN_LOGS,
  MOCK_GRN_SUMMARY,
  MOCK_INDENTS,
  MOCK_INVENTORY_ITEMS,
  MOCK_INVENTORY_STORES,
  MOCK_MANUFACTURERS,
  MOCK_RECONCILIATION_ROWS,
  MOCK_STOCK_LOTS,
  MOCK_STOCK_ROWS,
  MOCK_TRANSFERS,
} from './fixtures';

function summarizeStock(rows: typeof MOCK_STOCK_ROWS) {
  return {
    critical: rows.filter((r) => r.status === 'critical').length,
    low: rows.filter((r) => r.status === 'low').length,
    normal: rows.filter((r) => r.status === 'normal').length,
  };
}

function matchesSearch(value: string, search?: string): boolean {
  if (!search?.trim()) return true;
  const q = search.trim().toLowerCase();
  return value.toLowerCase().includes(q);
}

/** Mock fetchers mirror future API response shapes for drop-in replacement. */
export async function mockFetchInventoryStores(): Promise<InventoryStore[]> {
  return MOCK_INVENTORY_STORES;
}

export async function mockFetchInventoryItems(): Promise<InventoryItemOption[]> {
  return MOCK_INVENTORY_ITEMS;
}

export async function mockFetchInventoryManufacturers(): Promise<InventoryManufacturerOption[]> {
  return MOCK_MANUFACTURERS;
}

export async function mockFetchInventoryDashboard(): Promise<InventoryDashboardData> {
  return MOCK_DASHBOARD;
}

export async function mockFetchInventoryDashboardStats(
  storeId?: string,
): Promise<InventoryDashboardStats> {
  const resolvedStoreId = storeId || MOCK_INVENTORY_STORES[0]?.id;
  const [items, stock, indents, expiring] = await Promise.all([
    mockFetchInventoryItems(),
    mockFetchInventoryStock({ store_id: resolvedStoreId, status: 'all' }),
    mockFetchInventoryIndents({ status: 'submitted', limit: 1 }),
    mockFetchInventoryExpiringLots(resolvedStoreId!),
  ]);
  return {
    active_items: items.length,
    low_stock: stock.summary.critical + stock.summary.low,
    expiring_soon: expiring.length,
    pending_approvals: indents.total,
  };
}


function mockExpiringLotsFromFixtures(storeId: string, withinDays: number) {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + withinDays);
  const todayKey = today.toISOString().slice(0, 10);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const lots: InventoryExpiringLot[] = [];

  for (const row of MOCK_STOCK_ROWS.filter((entry) => entry.store_id === storeId)) {
    for (const lot of MOCK_STOCK_LOTS[row.id] ?? []) {
      if (!lot.expiry_date || lot.expiry_date < todayKey || lot.expiry_date > cutoffKey) continue;
      lots.push({
        id: lot.id,
        item_name: row.item_name,
        lot_number: lot.lot_number,
        expiry_date: lot.expiry_date,
        quantity: lot.quantity,
        uom: row.uom,
      });
    }
  }

  return lots.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
}

export async function mockFetchInventoryExpiringLots(
  storeId: string,
  withinDays: number = INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS,
): Promise<InventoryExpiringLot[]> {
  return mockExpiringLotsFromFixtures(storeId, withinDays);
}

export async function mockFetchInventoryLowStockItems(
  storeId: string,
): Promise<InventoryLowStockItem[]> {
  const stock = await mockFetchInventoryStock({ store_id: storeId, status: 'all' });
  return stock.data
    .filter((row) => row.status === 'low' || row.status === 'critical')
    .map((row) => ({
      id: row.id,
      item_name: row.item_name,
      item_code: row.item_code,
      quantity: row.quantity,
      uom: row.uom,
      reorder_at: row.reorder_at,
    }));
}

export async function mockFetchInventoryStock(
  params: InventoryListParams = {},
): Promise<InventoryStockListData> {
  let rows = MOCK_STOCK_ROWS.filter(
    (row) => !params.store_id || row.store_id === params.store_id,
  );
  if (params.status && params.status !== 'all') {
    rows = rows.filter((row) => row.status === params.status);
  }
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.item_name.toLowerCase().includes(q) || row.item_code.toLowerCase().includes(q),
    );
  }
  return { data: rows, total: rows.length, summary: summarizeStock(rows) };
}

export async function mockFetchInventoryStockLots(stockId: string): Promise<InventoryStockLot[]> {
  return MOCK_STOCK_LOTS[stockId] ?? [];
}

export async function mockFetchInventoryIndents(
  params: InventoryIndentListParams = {},
): Promise<InventoryIndentListData> {
  let rows = [...MOCK_INDENTS];
  if (params.status && params.status !== 'all') {
    rows = rows.filter((row) => row.status === params.status);
  }
  if (params.search?.trim()) {
    rows = rows.filter((row) => matchesSearch(row.indent_number, params.search));
  }
  if (params.from_store_id) {
    rows = rows.filter((row) => row.from_store_id === params.from_store_id);
  }
  if (params.to_store_id) {
    rows = rows.filter((row) => row.to_store_id === params.to_store_id);
  }
  const limit = params.limit ?? 10;
  const page = params.page ?? 1;
  const start = (page - 1) * limit;
  const slice = rows.slice(start, start + limit);
  return { data: slice, total: rows.length };
}

export async function mockFetchInventoryGrnLogs(
  params: InventoryGrnListParams = {},
): Promise<InventoryGrnListData> {
  let rows = [...MOCK_GRN_LOGS];
  if (params.summary_filter === 'draft') {
    rows = rows.filter((r) => r.status === 'Draft');
  } else if (params.summary_filter === 'submitted') {
    rows = rows.filter((r) => r.status === 'Submitted');
  } else if (params.summary_filter === 'purchase') {
    rows = rows.filter((r) => r.type === 'Purchase');
  }
  if (params.status && params.status !== 'all') {
    const normalized = params.status === 'draft' ? 'Draft' : params.status === 'submitted' ? 'Submitted' : params.status;
    rows = rows.filter((r) => r.status === normalized);
  }
  if (params.type && params.type !== 'all') {
    rows = rows.filter((r) => r.type === params.type);
  }
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.grn_number.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.invoice_number?.toLowerCase().includes(q) ?? false),
    );
  }
  return { data: rows, total: rows.length, summary: MOCK_GRN_SUMMARY };
}

export async function mockFetchInventoryReconciliation(): Promise<InventoryReconciliationRow[]> {
  return MOCK_RECONCILIATION_ROWS;
}

export async function mockFetchInventoryTransfers(
  params: InventoryTransferListParams = {},
): Promise<InventoryTransferListData> {
  let rows = [...MOCK_TRANSFERS];
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.transfer_number.toLowerCase().includes(q) ||
        row.from_store.toLowerCase().includes(q) ||
        row.to_store.toLowerCase().includes(q) ||
        row.transfer_type.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q),
    );
  }
  const limit = params.limit ?? 10;
  const page = params.page ?? 1;
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), total: rows.length };
}
