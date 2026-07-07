import type {
  InventoryDashboardData,
  InventoryGrnLineDraft,
  InventoryGrnLogRow,
  InventoryGrnSummary,
  InventoryIndentLine,
  InventoryIndentRow,
  InventoryItemOption,
  InventoryManufacturerOption,
  InventoryReconciliationRow,
  InventoryStockLot,
  InventoryStockRow,
  InventoryStore,
  InventoryTransferLine,
  InventoryTransferRow,
} from '../types';

export const MOCK_INVENTORY_STORES: InventoryStore[] = [
  { id: 'store-cms', name: 'Central Medical Store', store_code: 'CMS-001', is_central_store: true },
  { id: 'store-new', name: 'New store', store_code: '000-STO-00001', is_central_store: false },
  { id: 'store-inv', name: 'Inventory store', store_code: 'INV-002', is_central_store: false },
];

export const MOCK_INVENTORY_ITEMS: InventoryItemOption[] = [
  { id: 'item-1', code: 'DRU-000001', name: 'Amoxicillin 500mg capsule', uom: 'strips', tracking_mode: 'lot', is_expirable: true },
  { id: 'item-2', code: 'ITM-0001', name: 'Augmentin', uom: 'strips', tracking_mode: 'lot', is_expirable: true },
  { id: 'item-3', code: 'DOLO 500mg', name: 'Paracetamol 500mg tablet', uom: 'unit', tracking_mode: 'lot', is_expirable: true },
  { id: 'item-4', code: 'MED-000002', name: 'Ibuprofen 400mg tablet', uom: 'unit', tracking_mode: 'lot', is_expirable: true },
  { id: 'item-5', code: 'CON-000002', name: 'HIMS Journey Demo SKU', uom: 'Tablet', tracking_mode: 'none', is_expirable: false },
  { id: 'item-6', code: 'TEST-SKU-001', name: 'Amoxicillin 500mg capsule', uom: 'unit', tracking_mode: 'lot', is_expirable: true },
];

export const MOCK_MANUFACTURERS: InventoryManufacturerOption[] = [
  { id: 'mfr-none', name: 'None' },
  { id: 'mfr-1', name: 'Sun Pharma' },
  { id: 'mfr-2', name: 'Cipla Ltd' },
];

export const MOCK_DASHBOARD: InventoryDashboardData = {
  stats: {
    active_items: 17,
    low_stock: 2,
    expiring_soon: 0,
    pending_approvals: 0,
  },
  low_stock_items: [
    {
      id: 'ls-1',
      item_name: 'Augmentin',
      item_code: 'ITM-0001',
      quantity: 2,
      uom: 'strips',
      reorder_at: 10,
    },
    {
      id: 'ls-2',
      item_name: 'Paracetamol 500mg tablet',
      item_code: 'DOLO 500mg',
      quantity: 0,
      uom: 'unit',
      reorder_at: 0,
    },
  ],
  expiring_lots: [],
};

export const MOCK_STOCK_ROWS: InventoryStockRow[] = [
  {
    id: 'stk-1',
    item_name: 'Paracetamol 500mg tablet',
    item_code: 'DOLO 500mg',
    quantity: 0,
    uom: 'unit',
    reorder_at: 0,
    min_reorder: 0,
    status: 'critical',
    store_id: 'store-cms',
    batches: 0,
  },
  {
    id: 'stk-2',
    item_name: 'Ibuprofen 400mg tablet',
    item_code: 'MED-000002',
    quantity: 1,
    uom: 'unit',
    reorder_at: 10,
    min_reorder: 10,
    status: 'low',
    store_id: 'store-cms',
    batches: 1,
  },
  {
    id: 'stk-3',
    item_name: 'Amoxicillin 500mg capsule',
    item_code: 'TEST-SKU-001',
    quantity: 880,
    uom: 'unit',
    reorder_at: 0,
    min_reorder: 0,
    status: 'normal',
    store_id: 'store-cms',
    batches: 2,
  },
  {
    id: 'stk-4',
    item_name: 'HIMS Journey Demo SKU',
    item_code: 'CON-000002',
    quantity: 785,
    uom: 'Tablet',
    reorder_at: 0,
    min_reorder: 0,
    status: 'normal',
    store_id: 'store-cms',
    batches: 1,
  },
  {
    id: 'stk-5',
    item_name: 'Inventory Item -1',
    item_code: 'INV-ITEM-1',
    quantity: 200,
    uom: 'stripss',
    reorder_at: 2,
    min_reorder: 2,
    status: 'normal',
    store_id: 'store-cms',
    batches: 1,
  },
];

export const MOCK_STOCK_LOTS: Record<string, InventoryStockLot[]> = {
  'stk-3': [
    {
      id: 'lot-12',
      lot_number: 'Lot 12',
      expiry_date: '2027-03-15',
      received_date: '2026-01-10',
      quantity: 210,
    },
    {
      id: 'lot-882',
      lot_number: '882',
      expiry_date: '2027-06-20',
      received_date: '2026-02-01',
      quantity: 670,
    },
  ],
};

export const MOCK_INDENTS: InventoryIndentRow[] = [
  {
    id: 'ind-1',
    indent_number: 'IND-202606-00013',
    request_date: '2026-06-12',
    from_store_id: 'store-new',
    to_store_id: 'store-cms',
    from_store: 'New store',
    to_store: 'Central Medical Store',
    route: 'stock_transfer',
    indent_type: 'store_transfer',
    priority: 'normal',
    status: 'approved',
    lines: [
      { id: 'ln-1', item_name: 'Augmentin', item_code: 'ITM-0001', requested_qty: 10, uom: 'strips' },
    ],
  },
  {
    id: 'ind-2',
    indent_number: 'DRAFT-IND-3cd2c91b01c5477789d6fc0621d57910',
    request_date: '2026-06-11',
    from_store_id: 'store-cms',
    to_store_id: 'store-new',
    from_store: 'Central Medical Store',
    to_store: 'New store',
    route: 'procurement',
    indent_type: 'store_transfer',
    priority: 'normal',
    status: 'draft',
    lines: [],
  },
  {
    id: 'ind-3',
    indent_number: 'IND-202606-00011',
    request_date: '2026-06-10',
    from_store_id: 'store-cms',
    to_store_id: 'store-inv',
    from_store: 'Central Medical Store',
    to_store: 'Inventory store',
    route: 'stock_transfer',
    indent_type: 'store_transfer',
    priority: 'normal',
    status: 'in_fulfillment',
    lines: [
      { id: 'ln-2', item_name: 'Paracetamol 500mg tablet', item_code: 'DOLO 500mg', requested_qty: 50, uom: 'unit' },
    ],
  },
  {
    id: 'ind-4',
    indent_number: 'IND-202606-00009',
    request_date: '2026-06-08',
    from_store_id: 'store-new',
    to_store_id: 'store-cms',
    from_store: 'New store',
    to_store: 'Central Medical Store',
    route: 'stock_transfer',
    indent_type: 'store_transfer',
    priority: 'normal',
    status: 'fulfilled',
    lines: [],
  },
];

export const MOCK_GRN_SUMMARY: InventoryGrnSummary = {
  all: 24,
  draft: 14,
  submitted: 10,
  purchase: 24,
};

export const MOCK_GRN_LOGS: InventoryGrnLogRow[] = [
  {
    id: 'grn-1',
    grn_number: 'GRN-20260629-F3828D68',
    status: 'Draft',
    type: 'Purchase',
    grn_date: '2026-06-29',
    invoice_number: '8989',
    submitted_at: null,
  },
  {
    id: 'grn-2',
    grn_number: 'GRN-20260628-A1B2C3D4',
    status: 'Submitted',
    type: 'Purchase',
    grn_date: '2026-06-28',
    invoice_number: 'INV-4421',
    submitted_at: '2026-06-12T14:23:00Z',
  },
  {
    id: 'grn-3',
    grn_number: 'GRN-20260627-E5F6G7H8',
    status: 'Draft',
    type: 'Transfer',
    grn_date: '2026-06-27',
    invoice_number: null,
    submitted_at: null,
  },
];

export const MOCK_RECONCILIATION_ROWS: InventoryReconciliationRow[] = [];

export const MOCK_TRANSFERS: InventoryTransferRow[] = [
  {
    id: 'trf-1',
    transfer_number: 'TRF-20260701-7E5C445F',
    transfer_date: '2026-07-01',
    from_store_id: null,
    to_store_id: null,
    from_store: '—',
    to_store: '—',
    transfer_type: 'normal',
    status: 'Completed',
    lines: [],
  },
  {
    id: 'trf-2',
    transfer_number: 'TRF-20260701-8A1B2C3D',
    transfer_date: '2026-07-01',
    from_store_id: 'store-cms',
    to_store_id: 'store-new',
    from_store: 'Central Medical Store',
    to_store: 'New store',
    transfer_type: 'normal',
    status: 'Completed',
    lines: [
      {
        id: 'tl-1',
        item_id: 'item-6',
        item_code: 'TEST-SKU-001',
        item_name: 'Amoxicillin 500mg capsule',
        uom: 'unit',
        quantity: 50,
      },
    ],
  },
  {
    id: 'trf-3',
    transfer_number: 'TRF-20260630-F4E5D6C7',
    transfer_date: '2026-06-30',
    from_store_id: 'store-new',
    to_store_id: 'store-inv',
    from_store: 'New store',
    to_store: 'Inventory store',
    transfer_type: 'emergency',
    status: 'Completed',
    lines: [],
  },
  {
    id: 'trf-4',
    transfer_number: 'TRF-20260629-B8C9D0E1',
    transfer_date: '2026-06-29',
    from_store_id: 'store-cms',
    to_store_id: 'store-inv',
    from_store: 'Central Medical Store',
    to_store: 'Inventory store',
    transfer_type: 'normal',
    status: 'Draft',
    remarks: 'Monthly replenishment',
    lines: [
      {
        id: 'tl-2',
        item_id: 'item-3',
        item_code: 'DOLO 500mg',
        item_name: 'Paracetamol 500mg tablet',
        uom: 'unit',
        quantity: 100,
        line_remarks: 'Urgent ward stock',
      },
    ],
  },
];

export const EMPTY_GRN_LINE = (): InventoryGrnLineDraft => ({
  id: crypto.randomUUID(),
  item_id: '',
  item_code: '',
  item_name: '',
  uom: '',
  purchase_uom: '',
  required_qty: null,
  remaining_qty: null,
  grn_qty: 0,
  purchase_rate: 0,
  batch_no: '',
  expiry_date: '',
  storage: '',
  remarks: '',
});

export const EMPTY_INDENT_LINE = (): InventoryIndentLine => ({
  id: crypto.randomUUID(),
  item_id: '',
  item_code: '',
  item_name: '',
  uom: '',
  qty_available: null,
  requested_qty: 0,
  last_grn: null,
  remarks: '',
});

export const EMPTY_TRANSFER_LINE = (): InventoryTransferLine => ({
  id: crypto.randomUUID(),
  item_id: '',
  item_code: '',
  item_name: '',
  uom: '',
  quantity: 0,
  line_remarks: '',
});
