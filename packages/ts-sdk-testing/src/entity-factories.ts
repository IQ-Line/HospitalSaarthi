import { randomUUID } from 'node:crypto';
import { TEST_ORG_ID } from './tenant-fixtures.js';

export interface TestOrganizationData {
  name: string;
  slug: string;
  type: 'hospital_chain' | 'medical_college' | 'standalone_hospital' | 'government_network';
  status?: 'active' | 'suspended' | 'decommissioned';
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
}

export function createTestOrganizationData(
  overrides?: Partial<TestOrganizationData>,
): TestOrganizationData {
  const tag = randomUUID().slice(0, 8);
  return {
    name: `Test Org ${tag}`,
    slug: `test-org-${tag}`,
    type: 'standalone_hospital',
    ...overrides,
  };
}

export interface TestTenantSeedData {
  org_id: string;
  parent_tenant_id?: string | null;
  name: string;
  slug: string;
  type: 'full_platform' | 'fragmented' | 'lite';
  provisioning_status?: 'provisioning' | 'active' | 'suspended' | 'decommissioned';
  data_isolation_level?: 'shared' | 'isolated';
  cerbos_scope_key: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
}

export function createTestTenantSeedData(
  overrides?: Partial<TestTenantSeedData>,
): TestTenantSeedData {
  const tag = randomUUID().slice(0, 8);
  return {
    org_id: TEST_ORG_ID,
    name: `Test Tenant ${tag}`,
    slug: `test-tenant-${tag}`,
    type: 'full_platform',
    cerbos_scope_key: `test_scope_${tag}`,
    ...overrides,
  };
}
