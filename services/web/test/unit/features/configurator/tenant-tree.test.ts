import { describe, expect, it } from 'vitest';
import type { ConfiguratorTenant } from '../../../../src/features/configurator/types';
import {
  buildDescendantBranchTreeRows,
  buildTenantTreeRows,
  filterTenantDescendants,
  filterTenantsToSubtree,
} from '../../../../src/features/configurator/tenant-tree';

function tenant(
  partial: Pick<ConfiguratorTenant, 'iq_tenant_id' | 'name' | 'slug' | 'parent_tenant_id'>,
): ConfiguratorTenant {
  return {
    iq_tenant_id: partial.iq_tenant_id,
    org_id: 'org-1',
    parent_tenant_id: partial.parent_tenant_id,
    name: partial.name,
    slug: partial.slug,
    type: partial.parent_tenant_id ? 'lite' : 'full_platform',
    cerbos_scope_key: `tenant:org-1:${partial.slug}`,
    provisioning_status: 'active',
    data_isolation_level: 'shared',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    branch_code: null,
    branch_type: null,
    address_line1: null,
    city: null,
    state: null,
    pin_code: null,
    contact_phone: null,
    contact_email: null,
    metadata: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: null,
    updated_by: null,
  };
}

describe('filterTenantsToSubtree', () => {
  const tenants = [
    tenant({ iq_tenant_id: 'root', name: 'Root', slug: 'root', parent_tenant_id: null }),
    tenant({ iq_tenant_id: 'b1', name: 'Branch 1', slug: 'b1', parent_tenant_id: 'root' }),
    tenant({ iq_tenant_id: 'b2', name: 'Branch 2', slug: 'b2', parent_tenant_id: 'root' }),
    tenant({ iq_tenant_id: 'b1c', name: 'Child', slug: 'b1c', parent_tenant_id: 'b1' }),
  ];

  it('includes root and all descendants but not siblings', () => {
    const scoped = filterTenantsToSubtree(tenants, 'b1');
    expect(scoped.map((t) => t.iq_tenant_id).sort()).toEqual(['b1', 'b1c']);
  });
});

describe('buildTenantTreeRows', () => {
  const tenants = [
    tenant({ iq_tenant_id: 'root', name: 'Root', slug: 'root', parent_tenant_id: null }),
    tenant({ iq_tenant_id: 'b1', name: 'Branch 1', slug: 'b1', parent_tenant_id: 'root' }),
    tenant({ iq_tenant_id: 'b1c', name: 'Nested', slug: 'b1c', parent_tenant_id: 'b1' }),
  ];

  it('nests children under parent when parent_tenant_id is set', () => {
    const rows = buildTenantTreeRows(tenants);
    expect(rows.map((r) => [r.name, r.depth])).toEqual([
      ['Root', 0],
      ['Branch 1', 1],
      ['Nested', 2],
    ]);
  });

  it('starts at scoped root for branch-admin views', () => {
    const scoped = filterTenantsToSubtree(tenants, 'b1');
    const rows = buildTenantTreeRows(scoped, { rootTenantId: 'b1' });
    expect(rows.map((r) => [r.name, r.depth])).toEqual([
      ['Branch 1', 0],
      ['Nested', 1],
    ]);
  });
});

describe('filterTenantDescendants', () => {
  const tenants = [
    tenant({ iq_tenant_id: 'root', name: 'Root', slug: 'root', parent_tenant_id: null }),
    tenant({ iq_tenant_id: 'b1', name: 'B1', slug: 'b1', parent_tenant_id: 'root' }),
    tenant({ iq_tenant_id: 'b2', name: 'B2', slug: 'b2', parent_tenant_id: 'root' }),
    tenant({ iq_tenant_id: 'b1c', name: 'B1 child', slug: 'b1c', parent_tenant_id: 'b1' }),
  ];

  it('excludes parent and siblings', () => {
    const descendants = filterTenantDescendants(tenants, 'b1');
    expect(descendants.map((t) => t.iq_tenant_id)).toEqual(['b1c']);
  });
});

describe('buildDescendantBranchTreeRows', () => {
  const tenants = [
    tenant({ iq_tenant_id: 'root', name: 'Root', slug: 'root', parent_tenant_id: null }),
    tenant({ iq_tenant_id: 'b1', name: 'B1', slug: 'b1', parent_tenant_id: 'root' }),
    tenant({ iq_tenant_id: 'b1c', name: 'B1 child', slug: 'b1c', parent_tenant_id: 'b1' }),
  ];

  it('lists nested branches under the selected parent only', () => {
    const rows = buildDescendantBranchTreeRows(tenants, 'root');
    expect(rows.map((r) => [r.name, r.depth])).toEqual([['B1', 0], ['B1 child', 1]]);
  });
});
