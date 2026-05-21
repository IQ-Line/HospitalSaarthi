import { apiClient } from '@/lib/api-client';
import type { ModulePermission, ModulePermissionListResponse } from '../types';

const BASE = '/api/v1/master-data/module-permissions';
const PAGE_SIZE = 200;

/** Loads the full `global_master.module_permissions` catalog (paginated API). */
export async function fetchAllModulePermissionsGlobal(): Promise<ModulePermission[]> {
  const rows: ModulePermission[] = [];
  let offset = 0;

  while (true) {
    const res = await apiClient<ModulePermissionListResponse>(
      `${BASE}?limit=${PAGE_SIZE}&offset=${offset}`,
      { method: 'GET' },
      { tenantIdOverride: null },
    );
    rows.push(...res.data);
    if (rows.length >= res.total || res.data.length === 0) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return rows;
}
