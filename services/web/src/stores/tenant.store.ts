import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist, type StateStorage } from 'zustand/middleware';
import { usePermissionsStore } from '@/stores/permissions.store';

/** Prod has no tenant persistence (dev-only convenience); a noop keeps the persist
 *  middleware type uniform so `store.persist` is always available. Writes/reads no-op. */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

interface TenantState {
  /** Tenant where the signed-in user row lives (JWT `iq_tenant_id`). */
  homeTenantId: string | null;
  /** Active working tenant (API `iq_tenant_id` header). Same as home for normal users. */
  tenantId: string | null;
  tenantName: string | null;
  /** Configurator organisation scope for the active tenant / header picker. */
  organizationId: string | null;
  organizationName: string | null;
  activeBranch: string | null;
  branches: Array<{ id: string; name: string }>;

  setTenant: (tenant: {
    tenantId: string | null;
    tenantName: string;
    organizationId?: string | null;
    organizationName?: string | null;
    branches: Array<{ id: string; name: string }>;
    activeBranch: string;
  }) => void;
  setTenantContext: (tenant: {
    homeTenantId: string;
    tenantId: string;
    tenantName: string;
    organizationId?: string | null;
    organizationName?: string | null;
    branches: Array<{ id: string; name: string }>;
    activeBranch: string;
  }) => void;
  setOrganizationScope: (scope: { organizationId: string; organizationName?: string | null }) => void;
  switchActiveTenant: (tenant: {
    tenantId: string;
    tenantName: string;
    organizationId?: string | null;
    organizationName?: string | null;
  }) => void;
  switchBranch: (branchId: string) => void;
  clearTenant: () => void;
}

const tenantSlice: StateCreator<
  TenantState,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  []
> = (set, get) => ({
  homeTenantId: null,
  tenantId: null,
  tenantName: null,
  organizationId: null,
  organizationName: null,
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
        organizationId: tenant.organizationId ?? null,
        organizationName: tenant.organizationName ?? null,
        branches: tenant.branches,
        activeBranch: tenant.activeBranch,
      },
      false,
      'setTenant',
    );
  },

  setOrganizationScope: (scope) => {
    set(
      {
        organizationId: scope.organizationId,
        organizationName: scope.organizationName ?? null,
      },
      false,
      'setOrganizationScope',
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
        organizationId: tenant.organizationId ?? null,
        organizationName: tenant.organizationName ?? null,
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
        organizationId: tenant.organizationId ?? state.organizationId,
        organizationName: tenant.organizationName ?? state.organizationName,
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
        organizationId: null,
        organizationName: null,
        activeBranch: null,
        branches: [],
      },
      false,
      'clearTenant',
    );
  },
});

const tenantStoreCreator = persist(tenantSlice, {
  name: 'hims-dev-tenant',
  // Dev: survive reload via sessionStorage. Prod: noop (no tenant persistence).
  storage: createJSONStorage(() => (import.meta.env.DEV ? sessionStorage : noopStorage)),
  partialize: (s) => ({
    homeTenantId: s.homeTenantId,
    tenantId: s.tenantId,
    tenantName: s.tenantName,
    organizationId: s.organizationId,
    organizationName: s.organizationName,
    activeBranch: s.activeBranch,
    branches: s.branches,
  }),
});

export const useTenantStore = create<TenantState>()(devtools(tenantStoreCreator, { name: 'tenant' }));
