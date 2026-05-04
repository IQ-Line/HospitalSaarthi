import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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

      setTenant: (tenant) =>
        set(
          {
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            branches: tenant.branches,
            activeBranch: tenant.activeBranch,
          },
          false,
          'setTenant',
        ),

      switchBranch: (branchId) => set({ activeBranch: branchId }, false, 'switchBranch'),

      clearTenant: () =>
        set(
          { tenantId: null, tenantName: null, activeBranch: null, branches: [] },
          false,
          'clearTenant',
        ),
    }),
    { name: 'tenant' },
  ),
);
