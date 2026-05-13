import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { configuratorKeys } from './query-keys';
import type {
  Organization,
  OrganizationCreateInput,
  OrganizationCreateResponse,
  OrganizationListResponse,
  OrganizationStatus,
  OrganizationType,
  OrganizationUpdateInput,
} from '../types';

const BASE = '/api/configurator/v1/organizations';

function buildListUrl(filters: { status?: OrganizationStatus; type?: OrganizationType }) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  const qs = params.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

export function useOrganizations(filters: {
  status?: OrganizationStatus;
  type?: OrganizationType;
}) {
  return useQuery({
    queryKey: configuratorKeys.organizations(filters),
    queryFn: () => apiClient<OrganizationListResponse>(buildListUrl(filters)),
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: configuratorKeys.organizationDetail(id),
    queryFn: () => apiClient<Organization>(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrganizationCreateInput) =>
      apiClient<OrganizationCreateResponse>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configuratorKeys.all });
    },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrganizationUpdateInput }) =>
      apiClient<Organization>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: configuratorKeys.organizationDetail(id) });
      qc.invalidateQueries({ queryKey: configuratorKeys.all });
    },
  });
}
