import type { Department } from '@/features/master-data/types';

export type ItemClassification = 'inventory' | 'medicine';

export type ItemTrackingMode = 'by-batch' | 'by-serial' | 'no-tracking';

export function itemClassificationLabel(classification: ItemClassification): string {
  return classification === 'medicine' ? 'Medicine' : 'Inventory Item';
}

/** Display-only abbreviation for item type labels in the form (not the persisted item code). */
export function itemTypeCodePrefix(itemTypeName: string): string {
  const letters = itemTypeName.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  return letters.padEnd(3, 'X').slice(0, 3);
}

export function departmentLabelFromIds(ids: string[], departments: Department[]): string {
  if (ids.length === 0) return 'Select departments…';
  const names = ids
    .map((id) => departments.find((d) => d.id === id)?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return `${ids.length} selected`;
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export type ItemMasterPharmacyAttributes = {
  genericName: string;
  strength: string;
  dosageForm: string;
  prescriptionRequired: boolean;
  minDispensingUomId: string;
  minDispensingUomName: string;
  drugClass?: string;
  scheduleType?: string;
  mrp: number;
};

export type CreateItemMasterPayload = {
  name: string;
  display_name: string;
  item_classification: ItemClassification;
  item_type_id: string;
  category_id: string;
  sub_category_id?: string | null;
  tenant_formulary_id?: string | null;
  department_ids: string[];
  manufacturer_id?: string | null;
  manufacturer_item_code?: string;
  purchase_uom_id: string;
  consumption_uom_id: string;
  sale_uom_id: string;
  unit_of_measure: string;
  conversion_factor: number;
  item_tracking: ItemTrackingMode;
  is_expirable: boolean;
  is_short_expiry: boolean;
  loose_sale_allowed: boolean;
  hsn_gst_id?: string | null;
  catalog_number?: string;
  reorder_level: number;
  storage_condition_id?: string | null;
  pack_size?: string;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  description?: string;
  pharmacy?: ItemMasterPharmacyAttributes;
  is_active: boolean;
};
