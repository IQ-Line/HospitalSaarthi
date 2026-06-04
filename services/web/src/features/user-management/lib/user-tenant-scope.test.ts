import { describe, expect, it } from 'vitest';
import { resolveUserManagementListTenantScope } from './user-tenant-scope';

const HOME = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
const HOSPITAL = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('resolveUserManagementListTenantScope', () => {
  it('uses home tenant for platform super-admin (ignores header switch)', () => {
    expect(
      resolveUserManagementListTenantScope({
        isPlatformSuperAdmin: true,
        homeTenantId: HOME,
        activeTenantId: HOSPITAL,
      }),
    ).toBe(HOME);
  });

  it('uses active tenant for hospital admins', () => {
    expect(
      resolveUserManagementListTenantScope({
        isPlatformSuperAdmin: false,
        homeTenantId: HOME,
        activeTenantId: HOSPITAL,
      }),
    ).toBe(HOSPITAL);
  });

  it('falls back to home when active tenant is unset', () => {
    expect(
      resolveUserManagementListTenantScope({
        isPlatformSuperAdmin: false,
        homeTenantId: HOME,
        activeTenantId: null,
      }),
    ).toBe(HOME);
  });
});
