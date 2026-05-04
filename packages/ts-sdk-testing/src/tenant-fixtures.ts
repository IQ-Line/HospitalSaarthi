export const TEST_TENANT_ID = '00000000-0000-4000-a000-000000000001';
export const TEST_ORG_ID = '00000000-0000-4000-a000-000000000002';

export interface TestTenant {
  readonly tenantId: string;
  readonly orgId: string;
  readonly name: string;
  readonly slug: string;
}

export function createTestTenant(overrides?: Partial<TestTenant>): TestTenant {
  return {
    tenantId: TEST_TENANT_ID,
    orgId: TEST_ORG_ID,
    name: 'Test Hospital',
    slug: 'test-hospital',
    ...overrides,
  };
}
