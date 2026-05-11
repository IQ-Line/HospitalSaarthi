import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { usePermissionsStore } from '@/stores/permissions.store';

interface TenantState {
  tenantId: string | null;
  tenantName: string | null;
  activeBranch: string | null;
  branches: Array<{ id: string; name: string }>;

  setTenant: (tenant: {
    tenantId: string;
    tenantName: string;
    branches: Array<{ id: string; name: string }>;
    activeBranch: string;
  }) => void;
  switchBranch: (branchId: string) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  devtools(
    (set) => ({
      tenantId: null,
      tenantName: null,
      activeBranch: null,
      branches: [],

      setTenant: (tenant) => {
        usePermissionsStore.getState().clearPermissions();
        set(
          {
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            branches: tenant.branches,
            activeBranch: tenant.activeBranch,
          },
          false,
          'setTenant',
        );
      },

      switchBranch: (branchId) => {
        usePermissionsStore.getState().clearPermissions();
        set({ activeBranch: branchId }, false, 'switchBranch');
      },

      clearTenant: () => {
        usePermissionsStore.getState().clearPermissions();
        set(
          { tenantId: null, tenantName: null, activeBranch: null, branches: [] },
          false,
          'clearTenant',
        );
      },
    }),
    { name: 'tenant' },
  ),
);
