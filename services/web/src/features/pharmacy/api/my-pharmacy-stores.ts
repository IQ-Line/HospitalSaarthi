import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useInventoryStores } from '@/features/inventory/api/queries';
import { apiClient } from '@/lib/api-client';
import {
  mergePharmacyAssignedStores,
  type PharmacyAssignedStore,
  type PharmacyStoreAccessResponse,
} from '../lib/merge-pharmacy-assigned-stores';
import { pharmacyQueryKeys } from './query-keys';

const PHARMACY_STORE_ACCESS_PATH = '/api/user-management/auth/pharmacy-store-access';

export async function fetchMyPharmacyStoreAccess(): Promise<PharmacyStoreAccessResponse> {
  return apiClient<PharmacyStoreAccessResponse>(PHARMACY_STORE_ACCESS_PATH, { method: 'GET' });
}

export type MyPharmacyStoresResult = {
  stores: PharmacyAssignedStore[];
  primaryStoreId: string | null;
};

export function useMyPharmacyStores() {
  const accessQuery = useQuery({
    queryKey: pharmacyQueryKeys.myStoreAccess(),
    queryFn: fetchMyPharmacyStoreAccess,
  });
  const inventoryQuery = useInventoryStores();

  const data = useMemo((): MyPharmacyStoresResult | undefined => {
    if (accessQuery.data === undefined || inventoryQuery.data === undefined) {
      return undefined;
    }
    const stores = mergePharmacyAssignedStores(accessQuery.data, inventoryQuery.data);
    return {
      stores,
      primaryStoreId: accessQuery.data.primary_store_id,
    };
  }, [accessQuery.data, inventoryQuery.data]);

  return {
    data,
    isLoading: accessQuery.isLoading || inventoryQuery.isLoading,
    isError: accessQuery.isError || Boolean(inventoryQuery.error),
    error: accessQuery.error ?? inventoryQuery.error,
  };
}
