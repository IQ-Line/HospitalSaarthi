import type {
  InventoryCategory,
  InventoryHsnGst,
  InventoryItemMaster,
  InventoryItemType,
  InventoryManufacturer,
  InventoryStorageCondition,
  InventoryStoreType,
  InventoryUom,
} from './types';

export const DUMMY_INVENTORY_ITEMS: InventoryItemMaster[] = [
  {
    id: '1',
    item_code: 'CON-000002',
    item_name: 'Inventory Item -1',
    display_name: 'Inventory Item -1',
    classification: 'inventory_item',
    item_type: 'Consumables',
    product_category: 'OPEX > Medicine',
    department: 'Biochemistry',
    manufacturer: 'IQLINE',
    status: 'active',
  },
  {
    id: '2',
    item_code: 'CON-0001',
    item_name: 'Inventory Item - 2',
    display_name: 'Inventory Item - 2',
    classification: 'inventory_item',
    item_type: 'Consumables',
    product_category: 'CAPEX',
    department: 'Pharmacy',
    manufacturer: 'IQLINE',
    status: 'active',
  },
  {
    id: '3',
    item_code: 'CON-0003',
    item_name: 'Inventory Item - 3',
    display_name: 'Inventory Item - 3',
    classification: 'inventory_item',
    item_type: 'Consumables',
    product_category: 'OPEX > Medicine',
    department: 'Biochemistry',
    manufacturer: 'IQLINE',
    status: 'active',
  },
  {
    id: '4',
    item_code: 'MED-0001',
    item_name: 'Paracetamol 500mg',
    display_name: 'Paracetamol 500mg',
    classification: 'medicine',
    item_type: 'Medicine',
    product_category: 'OPEX > Medicine',
    department: 'Pharmacy',
    manufacturer: 'Cipla',
    status: 'active',
  },
  {
    id: '5',
    item_code: 'DRG-0001',
    item_name: 'Amoxicillin 250mg',
    display_name: 'Amoxicillin 250mg',
    classification: 'medicine',
    item_type: 'Drugs',
    product_category: 'OPEX > Medicine',
    department: 'Pharmacy',
    manufacturer: 'Sun Pharma',
    status: 'active',
  },
];

export const DUMMY_INVENTORY_CATEGORIES: InventoryCategory[] = [
  { id: '1', category_name: 'CAPEX', parent_category: null, status: 'active' },
  { id: '2', category_name: 'Medicine', parent_category: 'OPEX', status: 'active' },
  { id: '3', category_name: 'OPEX', parent_category: null, status: 'active' },
  { id: '4', category_name: 'Surgical', parent_category: 'OPEX', status: 'inactive' },
];

export const DUMMY_INVENTORY_ITEM_TYPES: InventoryItemType[] = [
  { id: '1', item_type: 'Consumables', status: 'active' },
  { id: '2', item_type: 'Drugs', status: 'active' },
  { id: '3', item_type: 'Medicine', status: 'active' },
];

export const DUMMY_INVENTORY_UOMS: InventoryUom[] = [
  { id: '1', name: 'Box', abbreviation: 'box', status: 'active' },
  { id: '2', name: 'strips', abbreviation: 'STRIPS', status: 'active' },
  { id: '3', name: 'Tablet', abbreviation: 'TABLET', status: 'active' },
  { id: '4', name: 'Medicine', abbreviation: 'MEDICINE', status: 'inactive' },
];

export const DUMMY_INVENTORY_STORAGE_CONDITIONS: InventoryStorageCondition[] = [
  {
    id: '1',
    storage_condition: 'At 20degree celcius',
    description: null,
    status: 'active',
  },
  {
    id: '2',
    storage_condition: 'Dry Storage',
    description: 'Store in a dry area away from moisture',
    status: 'active',
  },
  {
    id: '3',
    storage_condition: 'Frozen',
    description: 'Keep frozen at -18°C or below',
    status: 'active',
  },
  {
    id: '4',
    storage_condition: 'Refrigerated (2-8°C)',
    description: 'Store between 2°C and 8°C',
    status: 'active',
  },
  {
    id: '5',
    storage_condition: 'Room temperature',
    description: 'Store at room temperature (15-25°C)',
    status: 'inactive',
  },
];

export const DUMMY_INVENTORY_HSN_GST: InventoryHsnGst[] = [
  {
    id: '1',
    hsn_code: '39949999',
    cgst_percent: 6,
    sgst_percent: 6,
    igst_percent: 12,
    activation_date: '2025-01-01',
    status: 'active',
  },
  {
    id: '2',
    hsn_code: '3465',
    cgst_percent: 12,
    sgst_percent: 21,
    igst_percent: 97.9,
    activation_date: '2025-06-01',
    status: 'active',
  },
];

export const DUMMY_INVENTORY_MANUFACTURERS: InventoryManufacturer[] = [
  { id: '1', manufacturer: 'Abbot', code: null, status: 'active' },
  { id: '2', manufacturer: 'Cipla', code: 'CTP001', status: 'active' },
  { id: '3', manufacturer: 'IQLINE', code: 'Q123', status: 'inactive' },
  { id: '4', manufacturer: 'Sun Pharma', code: 'SUN001', status: 'active' },
];

export const DUMMY_INVENTORY_STORE_TYPES: InventoryStoreType[] = [
  {
    id: '1',
    code: 'adc_location',
    store_type: 'ADC Location',
    description: null,
    receive_stock: true,
    dispense: false,
    status: 'active',
  },
  {
    id: '2',
    code: 'ST-0003',
    store_type: 'Central Inventory Store',
    description: null,
    receive_stock: true,
    dispense: true,
    status: 'active',
  },
  {
    id: '3',
    code: 'ST-0004',
    store_type: 'Pharmacy Store',
    description: 'Primary pharmacy dispensing store',
    receive_stock: true,
    dispense: true,
    status: 'active',
  },
];
