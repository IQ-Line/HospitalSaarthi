export type PharmacyStoreAccessResponse = {
  primary_store_id: string | null;
  secondary_store_ids: string[];
};

export type PharmacyAssignedStore = {
  id: string;
  name: string;
  store_code: string;
  isPrimary: boolean;
};

type InventoryStoreLike = {
  id: string;
  name: string;
  store_code: string;
};

/** Joins UM store assignments with inventory catalog rows; primary store first. */
export function mergePharmacyAssignedStores(
  access: PharmacyStoreAccessResponse,
  inventoryStores: InventoryStoreLike[],
): PharmacyAssignedStore[] {
  const byId = new Map(inventoryStores.map((store) => [store.id, store]));
  const orderedIds: string[] = [];

  if (access.primary_store_id) {
    orderedIds.push(access.primary_store_id);
  }
  for (const storeId of access.secondary_store_ids) {
    if (!orderedIds.includes(storeId)) {
      orderedIds.push(storeId);
    }
  }

  return orderedIds.flatMap((storeId) => {
    const store = byId.get(storeId);
    if (!store) {
      return [];
    }
    return [
      {
        id: store.id,
        name: store.name,
        store_code: store.store_code,
        isPrimary: storeId === access.primary_store_id,
      },
    ];
  });
}
