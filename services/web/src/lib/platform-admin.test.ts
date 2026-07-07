import { describe, expect, it } from 'vitest';
import {
  isTenantAdmin,
  isTenantAdminRole,
  resolveTenantAdmin,
} from '@/lib/platform-admin';

describe('tenant administrator role recognition', () => {
  it('recognizes configurator tenant-admin role code', () => {
    expect(isTenantAdminRole('tenant-admin')).toBe(true);
    expect(isTenantAdmin(['tenant-admin'])).toBe(true);
  });

  it('recognizes Administrator role type default code (admin)', () => {
    expect(isTenantAdminRole('admin')).toBe(true);
    expect(resolveTenantAdmin({ principalRoles: ['admin'] })).toBe(true);
  });

  it('does not treat clinical roles as tenant admin', () => {
    expect(isTenantAdminRole('doctor')).toBe(false);
    expect(isTenantAdmin(['pharmacist', 'receptionist'])).toBe(false);
  });
});
