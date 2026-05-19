import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEnabledTenantModuleSlugs } from './use-enabled-tenant-modules';

const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
const visitpadModuleId = '71521630-5637-4aa9-809c-363cfa4ebdd3';

vi.mock('@/stores/tenant.store', () => ({
  useTenantStore: (selector: (s: { tenantId: string | null }) => unknown) =>
    selector({ tenantId }),
}));

vi.mock('@/features/configurator/api/tenants', () => ({
  useTenantModules: () => ({
    data: {
      data: [{ iq_tenant_id: tenantId, module_id: visitpadModuleId, is_active: true }],
      total: 1,
    },
    isPending: false,
    isError: false,
  }),
}));

vi.mock('./module-catalog', () => ({
  useModuleCatalog: () => ({
    index: {
      byId: new Map([
        [
          visitpadModuleId,
          {
            id: visitpadModuleId,
            slug: 'visitpad-templates',
            name: 'Visitpad',
            icon: null,
            category: 'clinical',
            is_active: true,
          },
        ],
      ]),
      bySlug: new Map(),
    },
    isPending: false,
    isError: false,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useEnabledTenantModuleSlugs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves tenant_modules via catalog index without capability inference', async () => {
    const { result } = renderHook(() => useEnabledTenantModuleSlugs(), { wrapper });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.has('visitpad-templates')).toBe(true);
    expect(result.current?.has('visitpad_templates')).toBe(true);
    expect(result.current?.has('user-management')).toBe(false);
  });
});
