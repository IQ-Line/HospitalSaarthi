import { describe, it, expect, vi } from 'vitest';
import { listTenants } from './list-tenants.js';
import type { TenantRepo } from '../ports.js';
import type { Tenant, TenantFilters } from '../domain/tenant.types.js';

function createMockTenant(overrides?: Partial<Tenant>): Tenant {
  return {
    iq_tenant_id: '22222222-2222-4222-8222-222222222222',
    org_id: '33333333-3333-4333-8333-333333333333',
    parent_tenant_id: null,
    name: 'Test Tenant',
    slug: 'test-tenant',
    type: 'full_platform',
    provisioning_status: 'active',
    data_isolation_level: 'shared',
    cerbos_scope_key: 'test_scope',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    metadata: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

function createMockRepo(tenants: Tenant[]): TenantRepo {
  return {
    findAll: vi.fn().mockResolvedValue(tenants),
    findById: vi.fn(),
    findByOrgId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

describe('listTenants', () => {
  it('delegates to repo.findAll with no filters', async () => {
    const tenants = [createMockTenant()];
    const repo = createMockRepo(tenants);

    const result = await listTenants(repo);

    expect(result).toEqual(tenants);
    expect(repo.findAll).toHaveBeenCalledWith(undefined);
  });

  it('passes filters through to repo.findAll', async () => {
    const repo = createMockRepo([]);
    const filters: TenantFilters = {
      provisioning_status: 'active',
      type: 'full_platform',
    };

    await listTenants(repo, filters);

    expect(repo.findAll).toHaveBeenCalledWith(filters);
  });

  it('returns empty array when repo returns no results', async () => {
    const repo = createMockRepo([]);

    const result = await listTenants(repo);

    expect(result).toEqual([]);
  });
});
