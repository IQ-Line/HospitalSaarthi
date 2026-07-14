import type {
  IndentItemSearchResult,
  IndentRequestRow,
  PharmacyStoreOption,
} from '../types/replenishment-ui.types';

export const DEMO_PHARMACY_STORES: PharmacyStoreOption[] = [
  { id: 'store-central-medical', name: 'Central Medical Store' },
  { id: 'store-inventory', name: 'Inventory store' },
  { id: 'store-opd-pharmacy', name: 'OPD Pharmacy' },
];

export const DEMO_INDENT_REQUESTS: IndentRequestRow[] = [
  {
    id: 'indent-12',
    indent_number: 'IND-202606-00012',
    request_date: '2026-06-12',
    to_store_name: 'Inventory store',
    priority: 'normal',
    status: 'procurement_pending',
    lines: [],
  },
  {
    id: 'indent-07',
    indent_number: 'IND-202606-00007',
    request_date: '2026-06-11',
    to_store_name: 'Inventory store',
    priority: 'normal',
    status: 'fulfilled',
    lines: [],
  },
  {
    id: 'indent-06',
    indent_number: 'IND-202606-00006',
    request_date: '2026-06-11',
    to_store_name: 'Inventory store',
    priority: 'normal',
    status: 'fulfilled',
    lines: [],
  },
];

export const DEMO_INDENT_ITEM_CATALOG: IndentItemSearchResult[] = [
  {
    id: 'item-paracetamol-500',
    name: 'Paracetamol 500mg Tab',
    item_code: 'MED-PCM-500',
    available_qty: 120,
    base_uom: 'TAB',
    last_grn_date: '2026-05-28',
  },
  {
    id: 'item-amoxicillin-250',
    name: 'Amoxicillin 250mg Cap',
    item_code: 'MED-AMX-250',
    available_qty: 48,
    base_uom: 'CAP',
    last_grn_date: '2026-05-20',
  },
  {
    id: 'item-ors-sachet',
    name: 'ORS Sachet',
    item_code: 'MED-ORS-01',
    available_qty: 200,
    base_uom: 'SACH',
    last_grn_date: '2026-06-01',
  },
  {
    id: 'item-insulin-glargine',
    name: 'Insulin Glargine 100IU/ml',
    item_code: 'MED-INS-GLA',
    available_qty: 12,
    base_uom: 'VIAL',
    last_grn_date: '2026-05-15',
  },
];
