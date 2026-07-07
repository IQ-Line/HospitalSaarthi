import { useMemo } from 'react';
import { useInventoryUoms } from './queries';
import { INVENTORY_MASTERS_FORM_LOOKUP_PARAMS } from './list-url';
import type { InventoryUom } from '../types';

/** Dropdown shape for operational inventory screens (GRN purchase unit, etc.). */
export type UomMasterOption = {
  id: string;
  name: string;
  abbreviation: string;
};

export function mapUomMasterRow(row: InventoryUom): UomMasterOption {
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation,
  };
}

/** Resolve stored purchase UOM text (abbreviation or name) to a master row. */
export function findUomMasterOption(
  purchaseUom: string | null | undefined,
  options: UomMasterOption[],
): UomMasterOption | undefined {
  const needle = purchaseUom?.trim().toLowerCase();
  if (!needle) return undefined;
  return options.find(
    (row) =>
      row.abbreviation.toLowerCase() === needle || row.name.toLowerCase() === needle,
  );
}

/** API stores purchase UOM as abbreviation text on GRN lines. */
export function purchaseUomAbbreviationForPayload(
  purchaseUom: string | null | undefined,
  options: UomMasterOption[],
): string | null {
  const trimmed = purchaseUom?.trim();
  if (!trimmed) return null;
  const match = findUomMasterOption(trimmed, options);
  return match?.abbreviation ?? trimmed;
}

/**
 * Active UOMs from **Inventory Supply Masters** (master-data).
 * API: `GET /api/v1/master-data/inventory/uoms`
 */
export function useUomMasterLookup() {
  const query = useInventoryUoms(INVENTORY_MASTERS_FORM_LOOKUP_PARAMS);
  const options = useMemo(
    () => (query.data?.data ?? []).map(mapUomMasterRow),
    [query.data?.data],
  );
  return {
    options,
    isLoading: query.isLoading,
    isError: Boolean(query.error),
    error: query.error,
  };
}
