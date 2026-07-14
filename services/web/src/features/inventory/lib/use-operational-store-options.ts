import { useMemo } from 'react';
import {
  useInventoryIndentStores,
  useInventoryStores,
} from '@/features/inventory/api/queries';
import type { InventoryIndentStoreOption, InventoryStore } from '@/features/inventory/types';
import type { InventoryOperationalVariant } from '@/features/inventory/lib/inventory-operational-variant';
import { useMyPharmacyStores } from '@/features/pharmacy/api/my-pharmacy-stores';

function asIndentStoreOptions(stores: InventoryStore[]): InventoryIndentStoreOption[] {
  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    store_code: store.store_code,
    indent_authority: true,
    indent_target_store_id: null,
  }));
}

/**
 * Store options for inventory/pharmacy operational UIs.
 * When `variant` is pharmacy, `stores` / `indentStores` are limited to the user's assignments.
 * `catalogStores` / `catalogIndentStores` always expose the full tenant catalog (e.g. From store).
 */
export function useOperationalStoreOptions(variant: InventoryOperationalVariant = 'inventory'): {
  stores: InventoryStore[];
  catalogStores: InventoryStore[];
  indentStores: InventoryIndentStoreOption[];
  catalogIndentStores: InventoryIndentStoreOption[];
  assignedStoreIds: ReadonlySet<string> | null;
  primaryStoreId: string | null;
  isLoading: boolean;
} {
  const { data: inventoryStores = [], isLoading: inventoryLoading } = useInventoryStores();
  const { data: liveIndentStores = [], isLoading: indentLoading } = useInventoryIndentStores();
  const pharmacyStores = useMyPharmacyStores();

  const isPharmacy = variant === 'pharmacy';
  const pharmacyAssignmentsReady = !isPharmacy || pharmacyStores.data !== undefined;
  const pharmacyAssignmentsLoading = isPharmacy && pharmacyStores.isLoading;

  const assignedStoreIds = useMemo(() => {
    if (!isPharmacy || pharmacyStores.data === undefined) return null;
    return new Set(pharmacyStores.data.stores.map((store) => store.id));
  }, [isPharmacy, pharmacyStores.data]);

  const catalogIndentStores = useMemo((): InventoryIndentStoreOption[] => {
    return liveIndentStores.length > 0
      ? liveIndentStores
      : asIndentStoreOptions(inventoryStores);
  }, [inventoryStores, liveIndentStores]);

  const stores = useMemo(() => {
    if (!isPharmacy) return inventoryStores;
    // Do not flash the full catalog while assignments load.
    if (!pharmacyAssignmentsReady || assignedStoreIds == null) return [];
    return inventoryStores.filter((store) => assignedStoreIds.has(store.id));
  }, [assignedStoreIds, inventoryStores, isPharmacy, pharmacyAssignmentsReady]);

  const indentStores = useMemo(() => {
    if (!isPharmacy) return catalogIndentStores;
    if (!pharmacyAssignmentsReady || assignedStoreIds == null) return [];
    return catalogIndentStores.filter((store) => assignedStoreIds.has(store.id));
  }, [assignedStoreIds, catalogIndentStores, isPharmacy, pharmacyAssignmentsReady]);

  return {
    stores,
    catalogStores: inventoryStores,
    indentStores,
    catalogIndentStores,
    assignedStoreIds,
    primaryStoreId: isPharmacy ? (pharmacyStores.data?.primaryStoreId ?? null) : null,
    isLoading: inventoryLoading || indentLoading || pharmacyAssignmentsLoading,
  };
}
