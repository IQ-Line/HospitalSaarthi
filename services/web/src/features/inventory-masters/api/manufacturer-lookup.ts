import { useMemo } from 'react';
import { useInventoryManufacturers } from './queries';
import { INVENTORY_MASTERS_FORM_LOOKUP_PARAMS } from './list-url';
import type { InventoryManufacturer } from '../types';

/** Dropdown shape shared by GRN form and other operational inventory screens. */
export type ManufacturerMasterOption = {
  id: string;
  name: string;
  code: string | null;
};

export function mapManufacturerMasterRow(row: InventoryManufacturer): ManufacturerMasterOption {
  return {
    id: row.id,
    name: row.manufacturer,
    code: row.code,
  };
}

/**
 * Active manufacturers from **Inventory Supply Masters** (master-data).
 * API: `GET /api/v1/master-data/visitpad/manufacturers`
 *
 * Inventory does not maintain a separate manufacturers table — GRN `manufacturer_id`
 * references the same catalog as the Manufacturers master tab.
 */
export function useManufacturerMasterLookup() {
  const query = useInventoryManufacturers(INVENTORY_MASTERS_FORM_LOOKUP_PARAMS);
  const options = useMemo(
    () => (query.data?.data ?? []).map(mapManufacturerMasterRow),
    [query.data?.data],
  );
  return {
    options,
    isLoading: query.isLoading,
    isError: Boolean(query.error),
    error: query.error,
  };
}
