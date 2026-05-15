import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { usePermissionsStore } from '@/stores/permissions.store';

interface TenantState {
  tenantId: string | null;
  tenantName: string | null;
  activeBranch: string | null;
  branches: Array<{ id: string; name: string }>;

  setTenant: (tenant: {
    tenantId: string | null;
    tenantName: string;
    branches: Array<{ id: string; name: string }>;
    activeBranch: string;
  }) => void;
  switchBranch: (branchId: string) => void;
  clearTenant: () => void;
}

const tenantSlice: StateCreator<TenantState> = (set) => ({
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
});

const tenantStoreCreator = import.meta.env.DEV
  ? persist(tenantSlice, {
      name: 'hims-dev-tenant',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        tenantId: s.tenantId,
        tenantName: s.tenantName,
        activeBranch: s.activeBranch,
        branches: s.branches,
      }),
    })
  : tenantSlice;

export const useTenantStore = create<TenantState>()(devtools(tenantStoreCreator, { name: 'tenant' }));
