import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { storeConfigurationQueryKeys } from './query-keys';
import type {
  InventoryStoreRecord,
  PaginatedStoreList,
  StoreCreateInput,
  StoreListParams,
  StoreUpdateInput,
} from '../types';

const STORES_BASE = '/api/inventory/v1/stores';

export const STORE_LIST_DEFAULT_PAGE_SIZE = 20;
export const STORE_LIST_PAGE_SIZES = [10, 20, 50, 200] as const;

type ApiStore = InventoryStoreRecord;

type StoreListResponse = {
  data: ApiStore[];
  total: number;
};

type StoreSingleResponse = {
  data: ApiStore;
};

function buildStoresListUrl(params: StoreListParams): string {
  const q = new URLSearchParams();
  const pageIndex = params.pageIndex ?? 0;
  const pageSize = params.pageSize ?? STORE_LIST_DEFAULT_PAGE_SIZE;
  q.set('limit', String(pageSize));
  q.set('offset', String(pageIndex * pageSize));
  if (params.search?.trim()) {
    q.set('search', params.search.trim());
  }
  if (params.status === 'active') {
    q.set('is_active', 'true');
  } else if (params.status === 'inactive') {
    q.set('is_active', 'false');
  }
  return `${STORES_BASE}?${q.toString()}`;
}

export function useStores(params: StoreListParams = {}) {
  return useQuery({
    queryKey: storeConfigurationQueryKeys.list(params),
    queryFn: async (): Promise<PaginatedStoreList> => {
      const response = await apiClient<StoreListResponse>(buildStoresListUrl(params));
      return { data: response.data, total: response.total };
    },
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StoreCreateInput) => {
      const response = await apiClient<StoreSingleResponse>(STORES_BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeConfigurationQueryKeys.all });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: StoreUpdateInput }) => {
      const response = await apiClient<StoreSingleResponse>(`${STORES_BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeConfigurationQueryKeys.all });
    },
  });
}
