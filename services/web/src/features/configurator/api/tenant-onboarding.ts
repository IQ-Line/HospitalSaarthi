import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { refreshAccessToken } from '@/lib/auth-session';
import { configuratorKeys } from './query-keys';

const ENDPOINT = '/api/configurator/v1/tenant-onboarding';

export interface TenantOnboardingInput {
  organization: {
    id?: string;
    name?: string;
    slug?: string;
    type?: string;
    contact_email?: string | null;
    website?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  tenant: {
    name: string;
    slug: string;
    parent_tenant_id?: string | null;
    type?: string;
    branch_code?: string | null;
    branch_type?: string | null;
    address_line1?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  plan?: {
    slug: string;
    trial_end_date?: string | null;
    max_users_override?: number | null;
    max_branches_override?: number | null;
  };
  modules: Array<{ module_id: string; is_active: boolean }>;
  admin: {
    first_name: string;
    last_name?: string | null;
    // Spec: nullable + not required (optional contact email, not the login credential).
    email?: string | null;
    password: string;
    phone?: string | null;
    username?: string | null;
  };
}

export interface TenantOnboardingResult {
  organization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  tenant: {
    iq_tenant_id: string;
    org_id: string;
    name: string;
    slug: string;
    provisioning_status: string;
  };
  tenant_modules: Array<{
    iq_tenant_id: string;
    module_id: string;
    is_active: boolean;
  }>;
  admin_role: {
    id: string;
    code: string;
    display_name: string;
    is_system: boolean;
  };
  admin_user: {
    id: string;
    email: string;
    full_name: string;
  };
  provisioning_status: 'completed';
  correlation_id: string;
}

export function useProvisionTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TenantOnboardingInput) => {
      await refreshAccessToken();
      return apiClient<TenantOnboardingResult>(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configuratorKeys.all });
    },
  });
}
