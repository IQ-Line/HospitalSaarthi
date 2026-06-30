import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { INVENTORY_MASTERS_API_BASE, inventoryMastersQueryKeys } from './query-keys';
import type {
  InventoryMasterListParams,
  InventoryMasterStatus,
  InventoryStoreType,
  PaginatedList,
} from '../types';

type ApiInventoryStoreType = {
  id: string;
  code: string;
  name: string;
  description: string;
  can_receive_stock: boolean;
  can_dispense: boolean;
  can_issue_to_ward: boolean;
  track_batch_expiry: boolean;
  indent_authority: boolean;
  is_active: boolean;
};

type InventoryStoreTypeListResponse = {
  data: ApiInventoryStoreType[];
  total: number;
};

const STORE_TYPES_PATH = `${INVENTORY_MASTERS_API_BASE}/store-types`;

function mapStatus(isActive: boolean): InventoryMasterStatus {
  return isActive ? 'active' : 'inactive';
}

function mapApiStoreType(row: ApiInventoryStoreType): InventoryStoreType {
  return {
    id: row.id,
    code: row.code,
    store_type: row.name,
    description: row.description || null,
    receive_stock: row.can_receive_stock,
    dispense: row.can_dispense,
    can_issue_to_ward: row.can_issue_to_ward,
    track_batch_expiry: row.track_batch_expiry,
    indent_authority: row.indent_authority,
    status: mapStatus(row.is_active),
  };
}

function buildStoreTypesListUrl(params: InventoryMasterListParams): string {
  const q = new URLSearchParams();
  const pageIndex = params.pageIndex ?? 0;
  const pageSize = params.pageSize ?? 50;
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
  return `${STORE_TYPES_PATH}?${q.toString()}`;
}

export function useInventoryStoreTypes(params: InventoryMasterListParams = {}) {
  return useQuery({
    queryKey: inventoryMastersQueryKeys.storeTypes(params),
    queryFn: async (): Promise<PaginatedList<InventoryStoreType>> => {
      const response = await apiClient<InventoryStoreTypeListResponse>(
        buildStoreTypesListUrl(params),
      );
      return {
        data: response.data.map(mapApiStoreType),
        total: response.total,
      };
    },
  });
}
