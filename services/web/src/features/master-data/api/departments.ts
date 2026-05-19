import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type { DepartmentListResponse, DepartmentType } from '../types';

const BASE = '/api/v1/master-data/departments';

export function useDepartments(departmentType?: DepartmentType) {
  const params = departmentType ? `?type=${departmentType}` : '';
  return useQuery({
    queryKey: masterDataKeys.departments(departmentType),
    queryFn: () => apiClient<DepartmentListResponse>(`${BASE}${params}`),
  });
}
