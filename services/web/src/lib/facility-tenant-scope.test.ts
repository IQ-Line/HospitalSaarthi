import { describe, expect, it } from 'vitest';
import { isOperatingAsFacilityTenant } from './facility-tenant-scope';

describe('isOperatingAsFacilityTenant', () => {
  it('is false for non-superadmin', () => {
    expect(
      isOperatingAsFacilityTenant({
        isPlatformSuperAdmin: false,
        homeTenantId: 'home',
        activeTenantId: 'facility',
      }),
    ).toBe(false);
  });

  it('is false when superadmin is still on home tenant', () => {
    expect(
      isOperatingAsFacilityTenant({
        isPlatformSuperAdmin: true,
        homeTenantId: 'home',
        activeTenantId: 'home',
      }),
    ).toBe(false);
  });

  it('is true when superadmin switched to a facility tenant', () => {
    expect(
      isOperatingAsFacilityTenant({
        isPlatformSuperAdmin: true,
        homeTenantId: 'home',
        activeTenantId: 'facility',
      }),
    ).toBe(true);
  });
});
