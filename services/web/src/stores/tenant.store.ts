import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { usePermissionsStore } from '@/stores/permissions.store';

interface TenantState {
  /** Tenant where the signed-in user row lives (JWT `iq_tenant_id`). */
  homeTenantId: string | null;
  /** Active working tenant (API `iq_tenant_id` header). Same as home for normal users. */
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
  setTenantContext: (tenant: {
    homeTenantId: string;
    tenantId: string;
    tenantName: string;
    branches: Array<{ id: string; name: string }>;
    activeBranch: string;
  }) => void;
  switchActiveTenant: (tenant: { tenantId: string; tenantName: string }) => void;
  switchBranch: (branchId: string) => void;
  clearTenant: () => void;
}

const tenantSlice: StateCreator<TenantState> = (set, get) => ({
  homeTenantId: null,
  tenantId: null,
  tenantName: null,
  activeBranch: null,
  branches: [],

  setTenant: (tenant) => {
    const prev = get();
    const tenantChanged =
      prev.tenantId !== tenant.tenantId || prev.activeBranch !== tenant.activeBranch;
    if (tenantChanged) {
      usePermissionsStore.getState().clearPermissions();
    }
    set(
      {
        homeTenantId: tenant.tenantId,
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        branches: tenant.branches,
        activeBranch: tenant.activeBranch,
      },
      false,
      'setTenant',
    );
  },

  setTenantContext: (tenant) => {
    const prev = get();
    const tenantChanged =
      prev.tenantId !== tenant.tenantId ||
      prev.homeTenantId !== tenant.homeTenantId ||
      prev.activeBranch !== tenant.activeBranch;
    if (tenantChanged) {
      usePermissionsStore.getState().clearPermissions();
    }
    set(
      {
        homeTenantId: tenant.homeTenantId,
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        branches: tenant.branches,
        activeBranch: tenant.activeBranch,
      },
      false,
      'setTenantContext',
    );
  },

  switchActiveTenant: (tenant) => {
    usePermissionsStore.getState().clearPermissions();
    set(
      (state) => ({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        activeBranch: state.activeBranch ?? state.branches[0]?.id ?? null,
      }),
      false,
      'switchActiveTenant',
    );
  },

  switchBranch: (branchId) => {
    usePermissionsStore.getState().clearPermissions();
    set({ activeBranch: branchId }, false, 'switchBranch');
  },

  clearTenant: () => {
    usePermissionsStore.getState().clearPermissions();
    set(
      {
        homeTenantId: null,
        tenantId: null,
        tenantName: null,
        activeBranch: null,
        branches: [],
      },
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
        homeTenantId: s.homeTenantId,
        tenantId: s.tenantId,
        tenantName: s.tenantName,
        activeBranch: s.activeBranch,
        branches: s.branches,
      }),
    })
  : tenantSlice;

export const useTenantStore = create<TenantState>()(devtools(tenantStoreCreator, { name: 'tenant' }));
