import type {
  InventoryDashboardData,
  InventoryStockListData,
  InventoryStore,
} from './types';

export const DUMMY_INVENTORY_STORES: InventoryStore[] = [
  { id: 'store-1', name: 'Central Medical Store', branch: 'Main Branch' },
  { id: 'store-2', name: 'Pharmacy Store', branch: 'Main Branch' },
  { id: 'store-3', name: 'Biochemistry Store', branch: 'Main Branch' },
];

export const DUMMY_INVENTORY_DASHBOARD: InventoryDashboardData = {
  stats: {
    active_items: 17,
    low_stock: 2,
    expiring_soon: 0,
    pending_approvals: 0,
  },
  low_stock_items: [
    {
      id: '1',
      item_name: 'Augmentin 625mg',
      quantity: 2,
      uom: 'strips',
      reorder_at: 10,
    },
    {
      id: '2',
      item_name: 'Paracetamol 500mg tablet',
      quantity: 0,
      uom: 'unit',
      reorder_at: 0,
    },
  ],
  expiring_lots: [],
};

export const DUMMY_INVENTORY_STOCK: InventoryStockListData = {
  data: [
    {
      id: '1',
      item_name: 'Paracetamol 500mg tablet',
      item_code: 'DOLO 500mg',
      quantity: 0,
      uom: 'unit',
      reorder_at: 0,
      status: 'critical',
    },
    {
      id: '2',
      item_name: 'Ibuprofen 400mg tablet',
      item_code: 'IBU-400',
      quantity: 1,
      uom: 'Tablet',
      reorder_at: 5,
      status: 'low',
    },
    {
      id: '3',
      item_name: 'Amoxicillin 250mg capsule',
      item_code: 'AMX-250',
      quantity: 880,
      uom: 'stripss',
      reorder_at: 100,
      status: 'normal',
    },
    {
      id: '4',
      item_name: 'Metformin 500mg tablet',
      item_code: 'MET-500',
      quantity: 150,
      uom: 'Tablet',
      reorder_at: 50,
      status: 'normal',
    },
    {
      id: '5',
      item_name: 'Omeprazole 20mg capsule',
      item_code: 'OMP-20',
      quantity: 45,
      uom: 'stripss',
      reorder_at: 20,
      status: 'normal',
    },
  ],
  total: 5,
  summary: { critical: 1, low: 1, normal: 3 },
};
