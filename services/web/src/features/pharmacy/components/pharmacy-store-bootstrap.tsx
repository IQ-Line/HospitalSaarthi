import { useEffect } from 'react';
import { useMyPharmacyStores } from '../api/my-pharmacy-stores';
import { usePharmacyStore } from '../store';

/** Loads assigned stores once per pharmacy route tree and seeds the selected store. */
export function PharmacyStoreBootstrap() {
  const { data } = useMyPharmacyStores();
  const initializeFromAssignments = usePharmacyStore((state) => state.initializeFromAssignments);

  useEffect(() => {
    if (!data) {
      return;
    }
    initializeFromAssignments(
      data.primaryStoreId,
      data.stores.map((store) => store.id),
    );
  }, [data, initializeFromAssignments]);

  return null;
}
