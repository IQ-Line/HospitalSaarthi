import { randomUUID } from 'node:crypto';
import { TEST_TENANT_ID, TEST_ORG_ID } from './tenant-fixtures.js';

export interface TestPrincipal {
  readonly userId: string;
  readonly tenantId: string;
  readonly orgId: string;
  readonly roles: string[];
  readonly sessionId: string;
  readonly iat: number;
  readonly exp: number;
  readonly iss: string;
}

export function createTestPrincipal(overrides?: Partial<TestPrincipal>): TestPrincipal {
  const now = Math.floor(Date.now() / 1000);
  return {
    userId: randomUUID(),
    tenantId: TEST_TENANT_ID,
    orgId: TEST_ORG_ID,
    roles: ['admin'],
    sessionId: randomUUID(),
    iat: now,
    exp: now + 3600,
    iss: 'hims-test',
    ...overrides,
  };
}
